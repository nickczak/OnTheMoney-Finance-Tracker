package com.onthemoney.dto;

import org.hibernate.validator.constraints.Range;

/** Request body for POST /api/credit-score. */
public record CreditScoreRequest(@Range(min = 300, max = 850) Integer score) {}
