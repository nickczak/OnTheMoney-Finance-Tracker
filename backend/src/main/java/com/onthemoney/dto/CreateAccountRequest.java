package com.onthemoney.dto;

import com.onthemoney.entity.AccountType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;

/** Request body for POST /api/accounts. */
public record CreateAccountRequest(
    @NotBlank String name, @Positive BigDecimal balance, AccountType accType) {}
