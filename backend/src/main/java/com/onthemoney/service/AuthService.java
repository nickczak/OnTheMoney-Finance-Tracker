package com.onthemoney.service;

import com.onthemoney.entity.SessionEntity;
import com.onthemoney.entity.UserEntity;
import com.onthemoney.repository.*;
import java.time.Duration;
import java.time.Instant;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

  private final UserRepository userRepo;
  private final SessionRepository sessionRepo;
  private final AccountRepository accountRepo;
  private final TransactionRepository transactionRepo;
  private final WatchlistRepository watchlistRepo;
  private final CreditScoreRepository creditScoreRepo;
  private final NetWorthHistoryRepository netWorthHistoryRepo;
  private final BCryptPasswordEncoder passwordEncoder;

  public AuthService(
      UserRepository userRepo,
      SessionRepository sessionRepo,
      AccountRepository accountRepo,
      TransactionRepository transactionRepo,
      WatchlistRepository watchlistRepo,
      CreditScoreRepository creditScoreRepo,
      NetWorthHistoryRepository netWorthHistoryRepo) {
    this.userRepo = userRepo;
    this.sessionRepo = sessionRepo;
    this.accountRepo = accountRepo;
    this.transactionRepo = transactionRepo;
    this.watchlistRepo = watchlistRepo;
    this.creditScoreRepo = creditScoreRepo;
    this.netWorthHistoryRepo = netWorthHistoryRepo;
    this.passwordEncoder = new BCryptPasswordEncoder();
  }

  /** Registers a user and immediately opens a session so signup needs no second login call. */
  @Transactional
  public SessionEntity signup(String email, String password, String displayName) {
    if (userRepo.findByEmail(email).isPresent()) {
      throw new IllegalArgumentException("Email already registered.");
    }
    UserEntity user = new UserEntity(email, passwordEncoder.encode(password), displayName);
    try {
      user = userRepo.save(user);
    } catch (DataIntegrityViolationException e) {
      throw new IllegalArgumentException("Email already registered.");
    }
    return sessionRepo.save(new SessionEntity(user));
  }

  // Creates a new session row, so the transaction must be read-write (PostgreSQL
  // rejects INSERTs in a read-only transaction).
  @Transactional
  public SessionEntity login(String email, String password) {
    UserEntity user =
        userRepo
            .findByEmail(email)
            .orElseThrow(() -> new IllegalArgumentException("Invalid email or password."));

    if (!passwordEncoder.matches(password, user.getPassword())) {
      throw new IllegalArgumentException("Invalid email or password.");
    }

    return sessionRepo.save(new SessionEntity(user));
  }

  public void logout(String token) {
    sessionRepo.findByToken(token).ifPresent(sessionRepo::delete);
  }

  // Deletes expired sessions, so the transaction must be read-write (PostgreSQL
  // rejects DELETEs in a read-only transaction).
  @Transactional
  public UserEntity validateSession(String token) {
    SessionEntity session =
        sessionRepo
            .findByToken(token)
            .orElseThrow(() -> new IllegalArgumentException("Invalid session."));

    if (session.isExpired()) {
      sessionRepo.delete(session);
      throw new IllegalArgumentException("Session expired.");
    }

    return session.getUser();
  }

  @Transactional
  public SessionEntity refreshSession(String token) {
    SessionEntity session =
        sessionRepo
            .findByToken(token)
            .orElseThrow(() -> new IllegalArgumentException("Invalid session."));

    if (session.isExpired()) {
      sessionRepo.delete(session);
      throw new IllegalArgumentException("Session expired.");
    }

    session.setExpiresAt(Instant.now().plus(Duration.ofDays(7)));
    return sessionRepo.save(session);
  }

  @Transactional
  public UserEntity updateProfile(String token, String displayName, String email) {
    UserEntity user = validateSession(token);

    userRepo
        .findByEmail(email)
        .filter(existing -> !existing.getId().equals(user.getId()))
        .ifPresent(
            existing -> {
              throw new IllegalArgumentException("Email already registered.");
            });

    user.setDisplayName(displayName);
    user.setEmail(email);
    try {
      return userRepo.save(user);
    } catch (DataIntegrityViolationException e) {
      throw new IllegalArgumentException("Email already registered.");
    }
  }

  /** Resolves the user from the session token — never trusts a client-supplied user id. */
  @Transactional
  public void changePassword(String token, String oldPassword, String newPassword) {
    UserEntity user = validateSession(token);

    if (!passwordEncoder.matches(oldPassword, user.getPassword())) {
      throw new IllegalArgumentException("Wrong password.");
    }

    user.setPasswordHash(passwordEncoder.encode(newPassword));
    userRepo.save(user);
  }

  /** Resolves the user from the session token and deletes their account and all their rows. */
  @Transactional
  public void deleteAccount(String token) {
    UserEntity user = validateSession(token);
    transactionRepo.deleteByUser(user);
    accountRepo.deleteByUser(user);
    watchlistRepo.deleteByUser(user);
    creditScoreRepo.deleteByUser(user);
    netWorthHistoryRepo.deleteByUser(user);
    sessionRepo.deleteByUser(user);
    userRepo.deleteById(user.getId());
  }
}
