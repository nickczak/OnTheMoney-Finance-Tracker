package com.onthemoney.entity;

import jakarta.persistence.*;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "sessions")
public class SessionEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false, unique = true)
  private String token;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "user_id", nullable = false)
  private UserEntity user;

  @Column(nullable = false, updatable = false)
  private Instant createdAt;

  @Column(nullable = false)
  private Instant expiresAt;

  public SessionEntity() {}

  public SessionEntity(UserEntity user) {
    this.token = UUID.randomUUID().toString();
    this.user = user;
    this.createdAt = Instant.now();
    this.expiresAt = createdAt.plus(Duration.ofDays(30));
  }

  public Long getId() {
    return id;
  }

  public String getToken() {
    return token;
  }

  public UserEntity getUser() {
    return user;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public Instant getExpiresAt() {
    return expiresAt;
  }

  public void setExpiresAt(Instant expiresAt) {
    this.expiresAt = expiresAt;
  }

  public boolean isExpired() {
    return Instant.now().isAfter(expiresAt);
  }
}
