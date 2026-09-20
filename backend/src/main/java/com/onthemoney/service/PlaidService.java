package com.onthemoney.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.onthemoney.entity.AccountEntity;
import com.onthemoney.entity.AccountType;
import com.onthemoney.entity.PlaidItemEntity;
import com.onthemoney.entity.TransactionEntity;
import com.onthemoney.entity.TransactionType;
import com.onthemoney.entity.UserEntity;
import com.onthemoney.repository.AccountRepository;
import com.onthemoney.repository.PlaidItemRepository;
import com.onthemoney.repository.TransactionRepository;
import jakarta.annotation.PreDestroy;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;

@Service
public class PlaidService {

  private static final Logger log = LoggerFactory.getLogger(PlaidService.class);
  private static final int DAYS_REQUESTED = 90;

  private final RestClient http;
  private final ObjectMapper mapper;
  private final PlaidCrypto plaidCrypto;
  private final PlaidItemRepository itemRepo;
  private final AccountRepository accountRepo;
  private final TransactionRepository transactionRepo;
  private final String clientId;
  private final String secret;
  private final String webhookUrl;
  private final String redirectUri;

  // Webhooks must return to Plaid quickly, so syncs they trigger run on a background thread.
  // One lock per item stops two threads from syncing the same Item at once.
  private final ConcurrentHashMap<Long, Object> syncLocks = new ConcurrentHashMap<>();
  private final ExecutorService webhookExecutor =
      Executors.newSingleThreadExecutor(
          r -> {
            Thread t = new Thread(r, "plaid-webhook-sync");
            t.setDaemon(true);
            return t;
          });

  public PlaidService(
      ObjectMapper mapper,
      PlaidCrypto plaidCrypto,
      PlaidItemRepository itemRepo,
      AccountRepository accountRepo,
      TransactionRepository transactionRepo,
      @Value("${plaid.client-id}") String clientId,
      @Value("${plaid.secret}") String secret,
      @Value("${plaid.env}") String env,
      @Value("${plaid.webhook-url}") String webhookUrl,
      @Value("${plaid.redirect-uri}") String redirectUri) {
    this.mapper = mapper;
    this.plaidCrypto = plaidCrypto;
    this.itemRepo = itemRepo;
    this.accountRepo = accountRepo;
    this.transactionRepo = transactionRepo;
    this.clientId = clientId;
    this.secret = secret;
    this.webhookUrl = webhookUrl;
    this.redirectUri = redirectUri;
    this.http =
        RestClient.builder()
            .baseUrl(
                "production".equals(env)
                    ? "https://production.plaid.com"
                    : "https://sandbox.plaid.com")
            .defaultHeader("Content-Type", "application/json")
            .defaultHeader("Plaid-Version", "2020-09-14")
            .build();
  }

  @PreDestroy
  void shutdown() {
    webhookExecutor.shutdownNow();
  }

  public record SyncResult(int accounts, int added, int modified, int removed) {}

  /** Starts Plaid Link for a user; may carry an oauth_state_id when returning from a bank OAuth. */
  public String createLinkToken(UserEntity user, String oauthStateId) {
    Map<String, Object> payload = new HashMap<>();
    payload.put("client_name", "On The Money");
    payload.put("user", Map.of("client_user_id", String.valueOf(user.getId())));
    payload.put("products", List.of("transactions"));
    payload.put("country_codes", List.of("US"));
    payload.put("language", "en");
    // Webhooks are configured in Plaid Dashboard; keep ordinary Link payloads minimal.
    // OAuth fields are added only during an OAuth return flow.
    if (!redirectUri.isBlank() && oauthStateId != null && !oauthStateId.isBlank()) {
      payload.put("redirect_uri", redirectUri);
      payload.put("oauth_state_id", oauthStateId);
    }
    payload.put("transactions", Map.of("days_requested", DAYS_REQUESTED));
    return post("/link/token/create", payload).path("link_token").asText();
  }

  /**
   * Update-mode Link token for an existing Item (e.g. after ITEM_LOGIN_REQUIRED). Passes the stored
   * access_token instead of products, so Plaid re-runs the shortened re-auth flow.
   */
  public String createUpdateLinkToken(UserEntity user, Long itemId) {
    PlaidItemEntity item = itemRepo.findByIdAndUser(itemId, user).orElse(null);
    if (item == null) {
      throw new PlaidApiException("ITEM_NOT_FOUND", "ITEM_NOT_FOUND", "Linked item not found", 404);
    }
    Map<String, Object> payload = new HashMap<>();
    payload.put("client_name", "On The Money");
    payload.put("user", Map.of("client_user_id", String.valueOf(user.getId())));
    payload.put("access_token", rawToken(item));
    payload.put("country_codes", List.of("US"));
    payload.put("language", "en");
    return post("/link/token/create", payload).path("link_token").asText();
  }

  /**
   * Exchanges Link's public_token for an access_token, stores it encrypted, and does the initial
   * pull.
   */
  @Transactional
  public PlaidItemEntity exchangePublicToken(
      UserEntity user, String publicToken, String institutionId, String institutionName) {
    JsonNode resp = post("/item/public_token/exchange", Map.of("public_token", publicToken));
    String plaidItemId = resp.path("item_id").asText();
    // Re-auth returns the same item_id: pick up the existing row rather than tripping the
    // unique constraint, and refresh its token.
    PlaidItemEntity item = itemRepo.findByPlaidItemId(plaidItemId).orElse(null);
    if (item == null) {
      item = new PlaidItemEntity();
      item.setUser(user);
      item.setPlaidItemId(plaidItemId);
      item.setInstitutionId(institutionId);
      item.setInstitutionName(institutionName);
    } else if (!item.getUser().getId().equals(user.getId())) {
      throw new IllegalArgumentException("This bank link belongs to another account.");
    }
    item.setAccessToken(plaidCrypto.encrypt(resp.path("access_token").asText()));
    item.setStatus("CONNECTED");
    itemRepo.save(item);
    // Initial pull / post-re-auth pull; also (re)activates the SYNC_UPDATES_AVAILABLE webhook.
    syncItemLocked(item);
    return item;
  }

  @Transactional
  public SyncResult syncItem(Long itemId, UserEntity user) {
    PlaidItemEntity item = itemRepo.findByIdAndUser(itemId, user).orElse(null);
    return item == null ? null : syncItemLocked(item);
  }

  @Transactional
  public List<SyncResult> syncAllForUser(UserEntity user) {
    List<SyncResult> results = new ArrayList<>();
    for (PlaidItemEntity item : itemRepo.findByUser(user)) {
      try {
        results.add(syncItemLocked(item));
      } catch (RuntimeException e) {
        log.error("sync failed for item {}: {}", item.getPlaidItemId(), e.getMessage(), e);
      }
    }
    return results;
  }

  public List<PlaidItemEntity> listItemsForUser(UserEntity user) {
    return itemRepo.findByUser(user);
  }

  /** Revokes every Item at Plaid and removes its local rows. Used by account- and user-deletion. */
  @Transactional
  public void disconnectAllForUser(UserEntity user) {
    for (PlaidItemEntity item : itemRepo.findByUser(user)) {
      disconnect(item.getId(), user);
    }
  }

  /** Revokes the Item at Plaid and removes its local accounts/transactions for this user. */
  @Transactional
  public boolean disconnect(Long itemId, UserEntity user) {
    PlaidItemEntity item = itemRepo.findByIdAndUser(itemId, user).orElse(null);
    if (item == null) return false;
    try {
      post("/item/remove", Map.of("access_token", rawToken(item)));
    } catch (RuntimeException e) {
      log.warn("item/remove failed for {}; removing locally anyway", item.getPlaidItemId(), e);
    }
    for (AccountEntity account :
        accountRepo.findByUserAndPlaidItemId(user, item.getPlaidItemId())) {
      List<TransactionEntity> txns =
          transactionRepo.findByUserAndFromAccountIdOrUserAndToAccountId(
              user, account.getId(), user, account.getId());
      transactionRepo.deleteAll(txns);
      accountRepo.delete(account);
    }
    itemRepo.delete(item);
    return true;
  }

  /** Handles a verified Plaid webhook payload. */
  public void handleWebhook(JsonNode payload) {
    String type = payload.path("webhook_type").asText();
    String code = payload.path("webhook_code").asText();

    // ITEM webhooks carry admin signals (expired login, pending expiration, errors) that the
    // frontend surfaces as "Reconnect" on the linked item.
    if ("ITEM".equals(type)) {
      updateItemStatus(code, payload.path("item_id").asText());
      return;
    }
    if (!"SYNC_UPDATES_AVAILABLE".equals(code)) return;
    String plaidItemId = payload.path("item_id").asText();
    Optional<PlaidItemEntity> item = itemRepo.findByPlaidItemId(plaidItemId);
    if (item.isEmpty()) {
      log.warn("webhook received for unknown item {}", plaidItemId);
      return;
    }
    PlaidItemEntity found = item.get();
    webhookExecutor.execute(
        () -> {
          try {
            syncItemLocked(found);
          } catch (RuntimeException e) {
            log.error("webhook sync failed for item {}: {}", plaidItemId, e.getMessage(), e);
            found.setStatus("ERROR");
            itemRepo.save(found);
          }
        });
  }

  private static final java.util.Map<String, String> ITEM_STATUS =
      java.util.Map.of(
          "LOGIN_REQUIRED", "LOGIN_REQUIRED",
          "PENDING_EXPIRATION", "PENDING_EXPIRATION",
          "ERROR", "ERROR",
          "USER_PERMISSION_REVOKED", "DISCONNECTED",
          "AT_DEPRECATION_DATE", "ERROR");

  private void updateItemStatus(String code, String plaidItemId) {
    String status = ITEM_STATUS.get(code);
    if (status == null) return;
    itemRepo
        .findByPlaidItemId(plaidItemId)
        .ifPresent(
            item -> {
              item.setStatus(status);
              itemRepo.save(item);
              log.info("item {} status -> {} ({})", plaidItemId, status, code);
            });
  }

  private SyncResult syncItemLocked(PlaidItemEntity item) {
    synchronized (syncLocks.computeIfAbsent(item.getId(), k -> new Object())) {
      int accounts = syncAccounts(item);
      SyncResult txns = syncTransactions(item);
      return new SyncResult(accounts, txns.added(), txns.modified(), txns.removed());
    }
  }

  private int syncAccounts(PlaidItemEntity item) {
    UserEntity user = item.getUser();
    JsonNode resp = post("/accounts/balance/get", Map.of("access_token", rawToken(item)));
    int count = 0;
    for (JsonNode pa : resp.path("accounts")) {
      String plaidAccountId = pa.path("account_id").asText();
      AccountEntity account =
          accountRepo.findByUserAndPlaidAccountId(user, plaidAccountId).orElse(null);
      if (account == null) {
        account = new AccountEntity();
        account.setUser(user);
        account.setName(pa.path("name").asText(pa.path("official_name").asText("Linked account")));
        account.setAccType(mapAccountType(pa));
        account.setPlaidAccountId(plaidAccountId);
        account.setPlaidItemId(item.getPlaidItemId());
      }
      BigDecimal balance = balanceOf(pa.path("balances"));
      if (balance != null) account.setBalance(balance);
      accountRepo.save(account);
      count++;
    }
    return count;
  }

  /**
   * Incremental transaction fetch. Persists the cursor after every page so a crash or a
   * TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION error can resume from the last saved cursor.
   */
  private SyncResult syncTransactions(PlaidItemEntity item) {
    UserEntity user = item.getUser();
    String cursor = item.getCursor();
    int added = 0, modified = 0, removed = 0;
    boolean restarted = false;
    while (true) {
      Map<String, Object> payload = new HashMap<>();
      payload.put("access_token", rawToken(item));
      if (cursor != null && !cursor.isBlank()) payload.put("cursor", cursor);
      JsonNode resp;
      try {
        resp = post("/transactions/sync", payload);
      } catch (PlaidApiException e) {
        if (restarted || !"TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION".equals(e.code())) throw e;
        restarted = true;
        cursor = item.getCursor(); // restart from the last persisted cursor
        continue;
      }
      for (JsonNode t : resp.path("added")) if (upsertTransaction(user, t)) added++;
      for (JsonNode t : resp.path("modified")) if (upsertTransaction(user, t)) modified++;
      for (JsonNode t : resp.path("removed")) {
        transactionRepo
            .findByUserAndPlaidTransactionId(user, t.path("transaction_id").asText())
            .ifPresent(transactionRepo::delete);
        removed++;
      }
      cursor = resp.path("next_cursor").asText();
      item.setCursor(cursor);
      item.setLastSyncAt(LocalDateTime.now());
      itemRepo.save(item);
      if (!resp.path("has_more").asBoolean(false)) break;
    }
    return new SyncResult(0, added, modified, removed);
  }

  /**
   * Imports a Plaid transaction as a read-only record. Plaid owns the authoritative balance, so
   * these never adjust AccountEntity balances; they only populate the transaction history the
   * existing UI already renders (positive amount = money out -> WITHDRAW, negative -> DEPOSIT).
   */
  private boolean upsertTransaction(UserEntity user, JsonNode node) {
    AccountEntity account =
        accountRepo
            .findByUserAndPlaidAccountId(user, node.path("account_id").asText())
            .orElse(null);
    if (account == null) return false;
    BigDecimal amount = node.path("amount").decimalValue();
    if (amount.signum() == 0) return false;
    boolean outflow = amount.signum() > 0;
    String plaidTxnId = node.path("transaction_id").asText();
    TransactionEntity t =
        transactionRepo
            .findByUserAndPlaidTransactionId(user, plaidTxnId)
            .orElseGet(TransactionEntity::new);
    t.setUser(user);
    t.setPlaidTransactionId(plaidTxnId);
    t.setAmount(amount.abs());
    t.setDate(LocalDate.parse(node.path("date").asText()));
    t.setDescription(node.path("name").asText(""));
    t.setType(outflow ? TransactionType.WITHDRAW : TransactionType.DEPOSIT);
    t.setFromAccountId(outflow ? account.getId() : null);
    t.setToAccountId(outflow ? null : account.getId());
    transactionRepo.save(t);
    return true;
  }

  private static AccountType mapAccountType(JsonNode pa) {
    return switch (pa.path("type").asText()) {
      case "depository" ->
          "savings".equals(pa.path("subtype").asText())
              ? AccountType.SAVINGS
              : AccountType.CHECKING;
      case "credit" -> AccountType.CREDIT_CARD;
      case "loan" -> AccountType.LOAN;
      case "investment", "brokerage" -> AccountType.INVESTMENT;
      default -> AccountType.CHECKING;
    };
  }

  private static BigDecimal balanceOf(JsonNode balances) {
    if (balances.path("current").isNumber()) return balances.path("current").decimalValue();
    if (balances.path("available").isNumber()) return balances.path("available").decimalValue();
    return null;
  }

  private String rawToken(PlaidItemEntity item) {
    return plaidCrypto.decrypt(item.getAccessToken());
  }

  private JsonNode post(String path, Map<String, Object> payload) {
    if (clientId.isBlank() || secret.isBlank()) {
      throw new PlaidApiException(
          "CONFIGURATION_ERROR",
          "PLAID_CREDENTIALS_MISSING",
          "PLAID_CLIENT_ID and PLAID_SECRET must be configured",
          500);
    }
    Map<String, Object> body = new HashMap<>(payload);
    body.put("client_id", clientId);
    body.put("secret", secret);
    return http.post()
        .uri(path)
        .body(body)
        .exchange(
            (request, response) -> {
              JsonNode json = mapper.readTree(response.getBody());
              if (response.getStatusCode().isError()) {
                throw new PlaidApiException(
                    json.path("error_type").asText(),
                    json.path("error_code").asText(),
                    json.path("error_message")
                        .asText("Plaid request failed: HTTP " + response.getStatusCode().value()),
                    response.getStatusCode().value());
              }
              return json;
            });
  }

  public static class PlaidApiException extends RuntimeException {
    private final String code;
    private final int status;

    PlaidApiException(String type, String code, String message, int status) {
      super("Plaid error (" + type + " " + code + "): " + message);
      this.code = code;
      this.status = status;
    }

    public String code() {
      return code;
    }

    public int status() {
      return status;
    }
  }
}
