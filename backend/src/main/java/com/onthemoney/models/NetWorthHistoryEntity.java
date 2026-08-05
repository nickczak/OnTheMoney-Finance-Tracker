package com.onthemoney.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "net_worth_history")
public class NetWorthHistoryEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(precision = 19, scale = 2)
  private BigDecimal netWorth = BigDecimal.ZERO;

  private LocalDate date;

  public Long getId() {
    return id;
  }

  public void setId(Long id) {
    this.id = id;
  }

  public BigDecimal getNetWorth() {
    return netWorth;
  }

  public void setNetWorth(BigDecimal netWorth) {
    this.netWorth = netWorth;
  }

  public LocalDate getDate() {
    return date;
  }

  public void setDate(LocalDate date) {
    this.date = date;
  }
} // END NetWorthHistoryEntity
