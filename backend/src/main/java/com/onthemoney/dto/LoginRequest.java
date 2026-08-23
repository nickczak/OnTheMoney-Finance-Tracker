package com.onthemoney.dto;

import jakarta.validation.constraints.NotBlank;

/** Request body for POST /api/auth/login. */
public record LoginRequest(@NotBlank String email, @NotBlank String password) {}
