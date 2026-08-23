package com.onthemoney.controller;

import com.onthemoney.dto.ChangePasswordRequest;
import com.onthemoney.dto.LoginRequest;
import com.onthemoney.dto.TokenRequest;
import com.onthemoney.dto.UpdateProfileRequest;
import com.onthemoney.entity.SessionEntity;
import com.onthemoney.entity.UserEntity;
import com.onthemoney.service.AuthService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Auth endpoints take JSON bodies — never query params — so emails (with @) and passwords never
 * appear in URLs, where they would be logged by proxies and access logs.
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

  private final AuthService authService;

  public AuthController(AuthService authService) {
    this.authService = authService;
  }

  /** Registers a user and returns a session token so the client can skip a second login call. */
  @PostMapping("/signup")
  public ResponseEntity<?> signup(
      @Valid @RequestBody SignupRequest request) { // IllegalArgumentException (duplicate email)
    SessionEntity session =
        authService.signup(request.email(), request.password(), request.displayName());
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(sessionResponse(session, "User registered successfully."));
  }

  @PostMapping("/login")
  public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
    SessionEntity session = authService.login(request.email(), request.password());
    return ResponseEntity.ok(sessionResponse(session, "User logged in successfully."));
  }

  /** Extends the session's expiry. Called by the client on app start to keep sessions alive. */
  @PostMapping("/refresh")
  public ResponseEntity<?> refresh(@Valid @RequestBody TokenRequest request) {
    SessionEntity session = authService.refreshSession(request.token());
    return ResponseEntity.ok(sessionResponse(session, "Session refreshed."));
  }

  @PostMapping("/logout")
  public ResponseEntity<?> logout(@Valid @RequestBody TokenRequest request) {
    authService.logout(request.token());
    return ResponseEntity.ok(Map.of("message", "User logged out successfully."));
  }

  @PostMapping("/me")
  public ResponseEntity<?> me(@Valid @RequestBody TokenRequest request) {
    UserEntity user = authService.validateSession(request.token());
    return ResponseEntity.ok(userJson(user));
  }

  @PostMapping("/change-password")
  public ResponseEntity<?> changePassword(@Valid @RequestBody ChangePasswordRequest request) {
    authService.changePassword(request.token(), request.oldPassword(), request.newPassword());
    return ResponseEntity.ok(Map.of("message", "Password changed successfully."));
  }

  @PostMapping("/delete-account")
  public ResponseEntity<?> deleteAccount(@Valid @RequestBody TokenRequest request) {
    authService.deleteAccount(request.token());
    return ResponseEntity.ok(Map.of("message", "Account deleted successfully."));
  }

  @PostMapping("/update")
  public ResponseEntity<?> update(@Valid @RequestBody UpdateProfileRequest request) {
    UserEntity user =
        authService.updateProfile(request.token(), request.displayName(), request.email());
    return ResponseEntity.ok(userJson(user));
  }

  private record SignupRequest(
      @NotBlank String email, @NotBlank String password, @NotBlank String displayName) {}

  private static Map<String, Object> userJson(UserEntity user) {
    return Map.of(
        "id", user.getId(),
        "email", user.getEmail(),
        "displayName", user.getDisplayName());
  }

  private static Map<String, Object> sessionResponse(SessionEntity session, String message) {
    return Map.of(
        "token", session.getToken(),
        "user", userJson(session.getUser()),
        "message", message);
  }
}
