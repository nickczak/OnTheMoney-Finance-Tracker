package com.onthemoney.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Request body for auth endpoints that act on an existing session (logout, refresh, me,
 * delete-account).
 */
public record TokenRequest(@NotBlank String token) {}
