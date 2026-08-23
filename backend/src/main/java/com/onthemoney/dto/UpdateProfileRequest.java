package com.onthemoney.dto;

import jakarta.validation.constraints.NotBlank;

/** Request body for POST /api/auth/update. */
public record UpdateProfileRequest(
    @NotBlank String token, @NotBlank String displayName, @NotBlank String email) {}
