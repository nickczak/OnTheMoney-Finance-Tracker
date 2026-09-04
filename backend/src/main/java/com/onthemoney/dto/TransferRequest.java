package com.onthemoney.dto;

import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;

/** Request body for POST /api/transfers. */
public record TransferRequest(
    Long fromAccountId,
    Long toAccountId,
    @Positive BigDecimal amount,
    String description,
    String date) {}
