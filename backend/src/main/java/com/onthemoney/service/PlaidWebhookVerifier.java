package com.onthemoney.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.crypto.ECDSAVerifier;
import com.nimbusds.jose.jwk.ECKey;
import com.nimbusds.jwt.SignedJWT;
import java.security.MessageDigest;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

/**
 * Verifies the signed JWT Plaid sends in the Plaid-Verification header of every webhook.
 *
 * <p>Plaid signs each webhook with an ES256 JWT whose key is fetched per-request from
 * /webhook_verification_key/get. The JWT payload carries a request_body_sha256 claim that must
 * match the SHA-256 of the raw body, so a spoofed or tampered webhook is rejected before its
 * payload is trusted.
 */
@Component
public class PlaidWebhookVerifier {

  private static final long MAX_AGE_MS = 300_000; // 5 minutes

  private final RestClient http;
  private final ObjectMapper mapper;

  public PlaidWebhookVerifier(
      ObjectMapper mapper,
      @Value("${plaid.client-id}") String clientId,
      @Value("${plaid.secret}") String secret,
      @Value("${plaid.env}") String env) {
    this.mapper = mapper;
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

  public boolean verify(byte[] rawBody, String jwt) {
    if (jwt == null || jwt.isBlank()) return false;
    try {
      SignedJWT signed = SignedJWT.parse(jwt);
      if (!JWSAlgorithm.ES256.equals(signed.getHeader().getAlgorithm())) return false;

      String kid = signed.getHeader().getKeyID();
      if (kid == null) return false;

      JsonNode key = fetchVerificationKey(kid).path("key");
      ECDSAVerifier verifier = new ECDSAVerifier(ECKey.parse(key.toString()).toECPublicKey());
      if (!signed.verify(verifier)) return false;

      String expectedHash = signed.getJWTClaimsSet().getStringClaim("request_body_sha256");
      if (expectedHash == null || !expectedHash.equals(sha256Hex(rawBody))) return false;

      var iat = signed.getJWTClaimsSet().getIssueTime();
      return iat != null && Math.abs(System.currentTimeMillis() - iat.getTime()) <= MAX_AGE_MS;
    } catch (Exception e) {
      return false; // any parse/verify failure (bad JWT, bad key, bad claim) -> reject
    }
  }

  private JsonNode fetchVerificationKey(String kid) {
    return http.post()
        .uri("/webhook_verification_key/get")
        .body(Map.of("key_id", kid))
        .exchange(
            (request, response) -> {
              JsonNode json = mapper.readTree(response.getBody());
              if (response.getStatusCode().isError()) {
                throw new IllegalStateException(
                    "failed to fetch Plaid webhook verification key: HTTP "
                        + response.getStatusCode().value());
              }
              return json;
            });
  }

  private static String sha256Hex(byte[] body) throws Exception {
    byte[] digest = MessageDigest.getInstance("SHA-256").digest(body);
    StringBuilder sb = new StringBuilder(digest.length * 2);
    for (byte b : digest) sb.append(String.format("%02x", b));
    return sb.toString();
  }
}
