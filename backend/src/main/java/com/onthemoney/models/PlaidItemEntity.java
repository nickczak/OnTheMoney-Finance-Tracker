package com.onthemoney.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "plaid_items")
public class PlaidItemEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "user_id", nullable = false)
  private UserEntity user;

  @Column(name = "plaid_item_id", nullable = false, unique = true)
  private String plaidItemId;

  // AES-encrypted value of Plaid's access_token (see PlaidCrypto). Never serialized.
  @JsonIgnore
  @Column(name = "access_token", length = 500)
  private String accessToken;

  /** opaque cursor persisted between /transactions/sync calls */
  @Column(name = "cursor")
  private String cursor;

  @Column(name = "institution_id")
  private String institutionId;

  @Column(name = "institution_name")
  private String institutionName;

  /** e.g. CONNECTED, LOGIN_REQUIRED, PENDING_EXPIRATION */
  @Column(name = "status")
  private String status = "CONNECTED";

  @Column(name = "created_at", nullable = false, updatable = false)
  private LocalDateTime createdAt = LocalDateTime.now();

  @Column(name = "last_sync_at")
  private LocalDateTime lastSyncAt;

  @JsonIgnore
  public UserEntity getUser() {
    return user;
  }

  public void setUser(UserEntity user) {
    this.user = user;
  }

  public Long getId() {
    return id;
  }

  public void setId(Long id) {
    this.id = id;
  }

  public String getPlaidItemId() {
    return plaidItemId;
  }

  public void setPlaidItemId(String plaidItemId) {
    this.plaidItemId = plaidItemId;
  }

  public String getAccessToken() {
    return accessToken;
  }

  public void setAccessToken(String accessToken) {
    this.accessToken = accessToken;
  }

  public String getCursor() {
    return cursor;
  }

  public void setCursor(String cursor) {
    this.cursor = cursor;
  }

  public String getInstitutionId() {
    return institutionId;
  }

  public void setInstitutionId(String institutionId) {
    this.institutionId = institutionId;
  }

  public String getInstitutionName() {
    return institutionName;
  }

  public void setInstitutionName(String institutionName) {
    this.institutionName = institutionName;
  }

  public String getStatus() {
    return status;
  }

  public void setStatus(String status) {
    this.status = status;
  }

  public LocalDateTime getCreatedAt() {
    return createdAt;
  }

  public LocalDateTime getLastSyncAt() {
    return lastSyncAt;
  }

  public void setLastSyncAt(LocalDateTime lastSyncAt) {
    this.lastSyncAt = lastSyncAt;
  }
}
