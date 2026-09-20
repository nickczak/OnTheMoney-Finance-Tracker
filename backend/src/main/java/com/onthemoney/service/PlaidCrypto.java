package com.onthemoney.service;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.codec.Hex;
import org.springframework.security.crypto.encrypt.AesBytesEncryptor;
import org.springframework.security.crypto.encrypt.AesBytesEncryptor.CipherAlgorithm;
import org.springframework.security.crypto.encrypt.BytesEncryptor;
import org.springframework.security.crypto.keygen.KeyGenerators;
import org.springframework.stereotype.Component;

/**
 * AES-256-GCM encrypt/decrypt for Plaid access tokens at rest, built on spring-security-crypto.
 *
 * <p>The key is derived from {@code application.secret} via PBKDF2 (256-bit), each message gets a
 * random 12-byte IV, and the raw Plaid token never appears in the database. Stored format is
 * Base64(IV || ciphertext || tag).
 *
 * <p>Note: Base64 is only a serialization step, not security; the confidentiality comes entirely
 * from AES-256-GCM. AesBytesEncryptor hex-decodes its salt argument, so the salt is the hex-encoded
 * secret string (deterministic, so rows stay decryptable across app restarts).
 */
@Component
public class PlaidCrypto {

  private static final int IV_LENGTH = 12;

  private final BytesEncryptor encryptor;

  public PlaidCrypto(@Value("${application.secret}") String secret) {
    this.encryptor =
        new AesBytesEncryptor(
            secret,
            new String(Hex.encode(secret.getBytes(StandardCharsets.UTF_8))),
            KeyGenerators.secureRandom(IV_LENGTH),
            CipherAlgorithm.GCM);
  }

  /** Encrypts a Plaid access token for storage; output is Base64(IV || ciphertext || tag). */
  public String encrypt(String plaintext) {
    byte[] enc = encryptor.encrypt(plaintext.getBytes(StandardCharsets.UTF_8));
    return Base64.getEncoder().encodeToString(enc);
  }

  public String decrypt(String encoded) {
    byte[] raw = encryptor.decrypt(Base64.getDecoder().decode(encoded));
    return new String(raw, StandardCharsets.UTF_8);
  }
}
