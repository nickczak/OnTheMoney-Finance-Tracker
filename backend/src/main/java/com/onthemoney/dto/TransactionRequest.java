package com.onthemoney.dto;

import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;

/** Request body for POST /api/accounts/{id}/deposit and /api/accounts/{id}/withdraw. */
public record TransactionRequest(@Positive BigDecimal amount, String description, String date) {}
