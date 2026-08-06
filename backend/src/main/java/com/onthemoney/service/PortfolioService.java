package com.onthemoney.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.onthemoney.entity.AccountEntity;
import com.onthemoney.entity.AccountType;
import com.onthemoney.entity.NetWorthHistoryEntity;
import com.onthemoney.entity.TransactionEntity;
import com.onthemoney.entity.TransactionType;
import com.onthemoney.repository.AccountRepository;
import com.onthemoney.repository.NetWorthHistoryRepository;
import com.onthemoney.repository.TransactionRepository;
import jakarta.annotation.PreDestroy;
import java.io.*;
import java.math.BigDecimal;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@Transactional
public class PortfolioService {

  private static final Logger log = LoggerFactory.getLogger(PortfolioService.class);

  private Process engine;
  private BufferedWriter toEngine;
  private BufferedReader fromEngine;
  private final ObjectMapper mapper;
  private final AccountRepository accountRepo;
  private final TransactionRepository transactionRepo;
  private final NetWorthHistoryRepository netWorthHistoryRepo;
  private final Path enginePath;
  private final long engineTimeoutMs;
  private final ExecutorService engineReader =
      Executors.newSingleThreadExecutor(
          r -> {
            Thread t = new Thread(r, "engine-reader");
            t.setDaemon(true);
            return t;
          });

  public PortfolioService(
      ObjectMapper mapper,
      AccountRepository accountRepo,
      TransactionRepository transactionRepo,
      NetWorthHistoryRepository netWorthHistoryRepo,
      @Value("${engine.binary-path:engine/build/src/run_engine}") String enginePathStr,
      @Value("${engine.timeout-ms:30000}") long engineTimeoutMs) {
    this.mapper = mapper;
    this.accountRepo = accountRepo;
    this.transactionRepo = transactionRepo;
    this.netWorthHistoryRepo = netWorthHistoryRepo;
    this.enginePath = Path.of(enginePathStr).toAbsolutePath().normalize();
    this.engineTimeoutMs = engineTimeoutMs;
  }

  @PreDestroy
  public void cleanup() {
    engineReader.shutdownNow();
    try {
      if (toEngine != null) toEngine.close();
    } catch (IOException e) {
      // ignore
    }
    try {
      if (fromEngine != null) fromEngine.close();
    } catch (IOException e) {
      // ignore
    }
    if (engine != null && engine.isAlive()) {
      engine.destroy();
      log.info("C++ engine stopped");
    }
  }

  // Java computations (simple math, no engine needed)

  public BigDecimal netWorth() {
    return accountRepo.findAll().stream()
        .map(a -> isLiability(a.getAccType()) ? a.getBalance().negate() : a.getBalance())
        .reduce(BigDecimal.ZERO, BigDecimal::add);
  }

  public BigDecimal totalAssets() {
    return accountRepo.findAll().stream()
        .map(a -> isLiability(a.getAccType()) ? a.getBalance().negate() : a.getBalance())
        .filter(b -> b.compareTo(BigDecimal.ZERO) > 0)
        .reduce(BigDecimal.ZERO, BigDecimal::add);
  }

  public BigDecimal totalLiabilities() {
    return accountRepo.findAll().stream()
        .filter(a -> isLiability(a.getAccType()))
        .map(AccountEntity::getBalance)
        .reduce(BigDecimal.ZERO, BigDecimal::add);
  }

  private static boolean isLiability(AccountType type) {
    return type == AccountType.CREDIT_CARD || type == AccountType.LOAN;
  }

  public boolean inTheRed() {
    return netWorth().compareTo(BigDecimal.ZERO) < 0;
  }

  public boolean inTheGreen() {
    return netWorth().compareTo(BigDecimal.ZERO) >= 0;
  }

  public List<NetWorthHistoryEntity> getNetWorthHistory() {
    return netWorthHistoryRepo.findAllByOrderByDateAsc();
  }

  public void recordSnapshot() {
    var today = LocalDate.now();
    var existing = netWorthHistoryRepo.findByDate(today);
    var entity =
        existing.isEmpty()
            ? new NetWorthHistoryEntity()
            : existing.get(0); // UPDATE data in the existing entity (if one already exists)
    entity.setNetWorth(netWorth());
    entity.setDate(today);
    netWorthHistoryRepo.save(entity);
  }

  @Scheduled(fixedRate = 86_400_000) // every 24 hours
  public void scheduledSnapshot() {
    recordSnapshot();
  }

  // Engine for heavy computation (lazy-start)

  private synchronized void ensureEngineStarted() throws IOException {
    if (engine != null && engine.isAlive()) return;

    if (!enginePath.toFile().exists()) {
      throw new IOException(
          "Engine binary not found at " + enginePath + ". Build the engine first.");
    }
    var pb = new ProcessBuilder(enginePath.toString());
    pb.directory(enginePath.getParent().toFile());
    engine = pb.start();
    toEngine = new BufferedWriter(new OutputStreamWriter(engine.getOutputStream()));
    fromEngine = new BufferedReader(new InputStreamReader(engine.getInputStream()));
    var t =
        new Thread(
            () -> {
              try (var err = new BufferedReader(new InputStreamReader(engine.getErrorStream()))) {
                while (err.readLine() != null) {}
              } catch (IOException e) {
                // stderr pipe closed
              }
            });
    t.setDaemon(true);
    t.start();
    log.info("C++ engine started (pid={})", engine.pid());
  }

  public synchronized JsonNode send(JsonNode request) throws IOException {
    ensureEngineStarted();
    toEngine.write(request.toString());
    toEngine.newLine();
    toEngine.flush();

    String line = readResponse();
    if (line == null) {
      throw new IOException("engine process terminated unexpectedly");
    }
    JsonNode response = mapper.readTree(line);
    // The engine reports parse/simulation failures as a normal "error" line;
    // surface those as a server error instead of a 200 OK with an error body.
    if ("error".equals(response.path("status").asText())) {
      throw new IOException(
          "engine error: " + response.path("message").asText("unknown engine error"));
    }
    return response;
  }

  /**
   * Reads one response line from the engine, giving up (and killing the engine) if the engine hangs
   * so an HTTP request thread is never blocked forever.
   */
  private String readResponse() throws IOException {
    CompletableFuture<String> future =
        CompletableFuture.supplyAsync(
            () -> {
              try {
                return fromEngine.readLine();
              } catch (IOException e) {
                throw new CompletionException(e);
              }
            },
            engineReader);
    try {
      return future.get(engineTimeoutMs, TimeUnit.MILLISECONDS);
    } catch (TimeoutException e) {
      if (engine != null) engine.destroyForcibly();
      throw new IOException("engine timed out after " + engineTimeoutMs + " ms");
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
      throw new IOException("interrupted while waiting for engine response");
    } catch (ExecutionException e) {
      Throwable cause = e.getCause();
      if (cause instanceof IOException io) throw io;
      throw new IOException("failed to read from engine", cause);
    }
  }

  public synchronized boolean isRunning() {
    return engine != null && engine.isAlive();
  }

  public JsonNode projectRetirement(
      double initialBalance,
      double monthlyContribution,
      double returnRate,
      int years,
      int simulations)
      throws IOException {
    var request = mapper.createObjectNode();
    request.put("action", "projectRetirement");
    request.put("initialBalance", initialBalance);
    request.put("monthlyContribution", monthlyContribution);
    request.put("returnRate", returnRate);
    request.put("years", years);
    request.put("simulations", simulations);
    return send(request);
  }

  // DB operation

  public AccountEntity updateAccount(
      Long id, String name, BigDecimal balance, AccountType accType) {
    var account = accountRepo.findById(id).orElse(null);
    if (account == null) return null;
    if (name != null) account.setName(name);
    if (balance != null) account.setBalance(balance);
    if (accType != null) account.setAccType(accType);
    return accountRepo.save(account);
  }

  public AccountEntity addAccount(String name, BigDecimal balance, AccountType accType) {
    var account = new AccountEntity();
    account.setName(name);
    account.setBalance(balance);
    account.setAccType(accType);
    return accountRepo.save(account);
  }

  public AccountEntity getAccountById(Long id) {
    return accountRepo.findById(id).orElse(null);
  }

  public AccountEntity getAccountByName(String name) {
    return accountRepo.findByName(name).orElse(null);
  }

  public List<AccountEntity> getAllAccounts() {
    return accountRepo.findAll();
  }

  public TransactionEntity transfer(
      Long fromAccountId, Long toAccountId, BigDecimal amount, LocalDate date) {
    var from = accountRepo.findById(fromAccountId).orElse(null);
    var to = accountRepo.findById(toAccountId).orElse(null);
    if (from == null || to == null) return null;
    if (fromAccountId.equals(toAccountId)) {
      throw new IllegalArgumentException("Cannot transfer to the same account");
    }
    if (from.getBalance().compareTo(amount) < 0) {
      throw new IllegalArgumentException("Insufficient funds: balance is $" + from.getBalance());
    }

    from.setBalance(from.getBalance().subtract(amount));
    to.setBalance(to.getBalance().add(amount));
    accountRepo.save(from);
    accountRepo.save(to);

    var t = new TransactionEntity();
    t.setFromAccountId(fromAccountId);
    t.setToAccountId(toAccountId);
    t.setAmount(amount);
    t.setDate(date != null ? date : LocalDate.now());
    t.setType(TransactionType.TRANSFER);
    t.setDescription("");
    return transactionRepo.save(t);
  }

  public TransactionEntity deposit(
      Long accountId, BigDecimal amount, String description, LocalDate date) {
    var account = accountRepo.findById(accountId).orElse(null);
    if (account == null) return null;
    account.setBalance(account.getBalance().add(amount));
    accountRepo.save(account);

    var t = new TransactionEntity();
    t.setToAccountId(accountId);
    t.setAmount(amount);
    t.setDate(date != null ? date : LocalDate.now());
    t.setType(TransactionType.DEPOSIT);
    t.setDescription(description != null ? description : "");
    return transactionRepo.save(t);
  }

  public TransactionEntity withdraw(
      Long accountId, BigDecimal amount, String description, LocalDate date) {
    var account = accountRepo.findById(accountId).orElse(null);
    if (account == null) return null;
    if (account.getBalance().compareTo(amount) < 0) {
      throw new IllegalArgumentException("Insufficient funds: balance is $" + account.getBalance());
    }
    account.setBalance(account.getBalance().subtract(amount));
    accountRepo.save(account);

    var t = new TransactionEntity();
    t.setFromAccountId(accountId);
    t.setAmount(amount);
    t.setDate(date != null ? date : LocalDate.now());
    t.setType(TransactionType.WITHDRAW);
    t.setDescription(description != null ? description : "");
    return transactionRepo.save(t);
  }

  public TransactionEntity updateTransaction(
      Long id, BigDecimal amount, String description, LocalDate date) {
    var t = transactionRepo.findById(id).orElse(null);
    if (t == null) return null;
    if (amount != null) t.setAmount(amount);
    if (description != null) t.setDescription(description);
    if (date != null) t.setDate(date);
    return transactionRepo.save(t);
  }

  public void deleteTransaction(Long id) {
    transactionRepo.deleteById(id);
  }

  public List<TransactionEntity> getTransactionsByAccount(Long accountId) {
    return transactionRepo.findByFromAccountIdOrToAccountId(accountId, accountId);
  }

  public List<TransactionEntity> getTransactions(LocalDate start, LocalDate end) {
    return transactionRepo.findByDateBetween(start, end);
  }

  public void deleteAllAccounts() {
    transactionRepo.deleteAll();
    accountRepo.deleteAll();
    // A full reset should leave a clean slate: drop the net-worth history too.
    netWorthHistoryRepo.deleteAll();
  }

  public void deleteAccountById(Long id) {
    var transactions = transactionRepo.findByFromAccountIdOrToAccountId(id, id);
    transactionRepo.deleteAll(transactions);
    accountRepo.deleteById(id);
    // Today's snapshot may still include the deleted account; drop it so the
    // next snapshot reflects the current portfolio.
    netWorthHistoryRepo.findByDate(LocalDate.now()).forEach(netWorthHistoryRepo::delete);
  }
}
