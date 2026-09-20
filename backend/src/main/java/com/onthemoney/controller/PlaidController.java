package com.onthemoney.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.onthemoney.entity.PlaidItemEntity;
import com.onthemoney.entity.UserEntity;
import com.onthemoney.service.PlaidService;
import com.onthemoney.service.PlaidWebhookVerifier;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/plaid")
public class PlaidController {

  private static final Logger log = LoggerFactory.getLogger(PlaidController.class);

  private final PlaidService plaidService;
  private final PlaidWebhookVerifier webhookVerifier;
  private final ObjectMapper mapper;

  public PlaidController(
      PlaidService plaidService, PlaidWebhookVerifier webhookVerifier, ObjectMapper mapper) {
    this.plaidService = plaidService;
    this.webhookVerifier = webhookVerifier;
    this.mapper = mapper;
  }

  /** Returns a link_token for the authenticated user. oauth_state_id is set on the OAuth return. */
  @PostMapping("/link_token")
  public Map<String, String> linkToken(
      @RequestAttribute("currentUser") UserEntity currentUser,
      @RequestParam(required = false) String oauth_state_id) {
    String token = plaidService.createLinkToken(currentUser, oauth_state_id);
    return Map.of("link_token", token);
  }

  /** Update-mode link_token for re-authenticating an existing Item (e.g. after a login expiry). */
  @PostMapping("/link_token/update")
  public Map<String, String> updateLinkToken(
      @RequestAttribute("currentUser") UserEntity currentUser,
      @Valid @RequestBody UpdateLinkRequest request) {
    String token = plaidService.createUpdateLinkToken(currentUser, request.itemId());
    return Map.of("link_token", token);
  }

  /**
   * Exchanges Link's public_token for an access_token, stores it, and performs the initial sync.
   */
  @PostMapping("/exchange")
  public JsonNode exchange(
      @RequestAttribute("currentUser") UserEntity currentUser,
      @Valid @RequestBody ExchangeRequest request) {
    PlaidItemEntity item =
        plaidService.exchangePublicToken(
            currentUser,
            request.public_token(),
            request.institution_id(),
            request.institution_name());
    return mapper.valueToTree(item);
  }

  /** Re-syncs all of the user's linked Items (balances + transactions). */
  @PostMapping("/sync")
  public List<PlaidService.SyncResult> sync(
      @RequestAttribute("currentUser") UserEntity currentUser) {
    return plaidService.syncAllForUser(currentUser);
  }

  @GetMapping("/items")
  public List<PlaidItemEntity> items(@RequestAttribute("currentUser") UserEntity currentUser) {
    return plaidService.listItemsForUser(currentUser);
  }

  @DeleteMapping("/items/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void disconnect(
      @PathVariable Long id, @RequestAttribute("currentUser") UserEntity currentUser) {
    if (!plaidService.disconnect(id, currentUser)) {
      throw new IllegalArgumentException("Plaid item not found");
    }
  }

  /**
   * Plaid-delivered transaction update webhook. Runs outside the auth interceptor (see
   * WebMvcConfig), so the signed Plaid-Verification JWT is the only credential trusted here.
   */
  @PostMapping(value = "/webhook", consumes = MediaType.APPLICATION_JSON_VALUE)
  public ResponseEntity<Map<String, Object>> webhook(
      @RequestBody byte[] rawBody,
      @RequestHeader(value = "Plaid-Verification", required = false) String verification) {
    if (!webhookVerifier.verify(rawBody, verification)) {
      return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
          .body(Map.of("error", "invalid webhook signature"));
    }
    try {
      plaidService.handleWebhook(mapper.readTree(rawBody));
    } catch (Exception e) {
      log.error("Failed to process Plaid webhook", e);
      return ResponseEntity.badRequest().body(Map.of("error", "malformed webhook payload"));
    }
    return ResponseEntity.ok(Map.of("received", true));
  }

  public record ExchangeRequest(
      @NotBlank String public_token, String institution_id, String institution_name) {}

  public record UpdateLinkRequest(@NotNull Long itemId) {}
}
