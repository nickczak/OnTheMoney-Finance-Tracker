package com.onthemoney.config;

import jakarta.validation.ConstraintViolationException;
import java.util.Map;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice
public class GlobalExceptionHandler {

  private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

  @ExceptionHandler(ResponseStatusException.class)
  public ResponseEntity<Map<String, String>> handleResponseStatus(ResponseStatusException ex) {
    return ResponseEntity.status(ex.getStatusCode())
        .body(Map.of("error", ex.getReason() != null ? ex.getReason() : "Error"));
  }

  /**
   * Constraint violations on @RequestParam/@PathVariable (requires @Validated on the controller).
   */
  @ExceptionHandler(ConstraintViolationException.class)
  public ResponseEntity<Map<String, String>> handleConstraintViolation(
      ConstraintViolationException ex) {
    String message =
        ex.getConstraintViolations().stream()
            .map(v -> v.getPropertyPath() + " " + v.getMessage())
            .collect(Collectors.joining("; "));
    return ResponseEntity.badRequest()
        .body(Map.of("error", message.isEmpty() ? "Validation failed" : message));
  }

  /**
   * @Valid body validation failures.
   */
  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<Map<String, String>> handleMethodArgumentNotValid(
      MethodArgumentNotValidException ex) {
    String message =
        ex.getBindingResult().getFieldErrors().stream()
            .map(fe -> fe.getField() + " " + fe.getDefaultMessage())
            .collect(Collectors.joining("; "));
    return ResponseEntity.badRequest()
        .body(Map.of("error", message.isEmpty() ? "Validation failed" : message));
  }

  @ExceptionHandler(HttpMessageNotReadableException.class)
  public ResponseEntity<Map<String, String>> handleUnreadable(HttpMessageNotReadableException ex) {
    return ResponseEntity.badRequest().body(Map.of("error", "Malformed request body"));
  }

  /** Wrong types on @RequestParam/@PathVariable (e.g. an invalid enum value). */
  @ExceptionHandler(MethodArgumentTypeMismatchException.class)
  public ResponseEntity<Map<String, String>> handleTypeMismatch(
      MethodArgumentTypeMismatchException ex) {
    String name = ex.getName() != null ? ex.getName() : "parameter";
    return ResponseEntity.badRequest()
        .body(Map.of("error", "Invalid value for '" + name + "': " + ex.getValue()));
  }

  /**
   * Business-rule violations from the service layer (e.g. insufficient funds, transferring to the
   * same account). Auth-related messages map to 401/409 so clients can distinguish them from plain
   * bad requests.
   */
  @ExceptionHandler(IllegalArgumentException.class)
  public ResponseEntity<Map<String, String>> handleIllegalArgument(IllegalArgumentException ex) {
    String msg = ex.getMessage();
    HttpStatus status = HttpStatus.BAD_REQUEST;
    if (msg != null) {
      if (msg.contains("registered")) {
        status = HttpStatus.CONFLICT;
      } else if (msg.contains("password")
          || msg.contains("session")
          || msg.contains("login")
          || msg.contains("token")) {
        status = HttpStatus.UNAUTHORIZED;
      }
    }
    return ResponseEntity.status(status).body(Map.of("error", msg));
  }

  @ExceptionHandler(Exception.class)
  public ResponseEntity<Map<String, String>> handleGeneral(Exception ex) {
    log.error("Unhandled exception", ex);
    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
        .body(Map.of("error", "Internal server error"));
  }
}
