package com.onthemoney.dto;

import jakarta.validation.constraints.NotBlank;

/** Request body for POST /api/auth/change-password. */
public record ChangePasswordRequest(
    @NotBlank String token, @NotBlank String oldPassword, @NotBlank String newPassword) {}
