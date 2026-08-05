package com.onthemoney.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;
import java.math.BigDecimal;

@Entity
@Table(name = "accounts")
public class AccountEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @NotBlank private String name;

  @PositiveOrZero
  @Column(precision = 19, scale = 2)
  private BigDecimal balance = BigDecimal.ZERO;

  @Enumerated(EnumType.STRING)
  private AccountType accType;

  public Long getId() {
    return id;
  }

  public void setId(Long id) {
    this.id = id;
  }

  public String getName() {
    return name;
  }

  public void setName(String name) {
    this.name = name;
  }

  public BigDecimal getBalance() {
    return balance;
  }

  public void setBalance(BigDecimal balance) {
    this.balance = balance;
  }

  public AccountType getAccType() {
    return accType;
  }

  public void setAccType(AccountType accType) {
    this.accType = accType;
  }
}
