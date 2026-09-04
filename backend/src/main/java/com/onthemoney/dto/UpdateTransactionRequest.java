package com.onthemoney.dto;

import java.math.BigDecimal;

/**
 * Request body for PUT /api/transactions/{id}. All fields are optional so a client can update just
 * the fields it wants changed.
 */
public record UpdateTransactionRequest(BigDecimal amount, String description, String date) {}
