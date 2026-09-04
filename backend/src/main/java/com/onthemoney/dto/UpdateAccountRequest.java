package com.onthemoney.dto;

import com.onthemoney.entity.AccountType;
import java.math.BigDecimal;

/**
 * Request body for PUT /api/accounts/{id}. All fields are optional so a client can update just the
 * fields it wants changed.
 */
public record UpdateAccountRequest(String name, BigDecimal balance, AccountType accType) {}
