package com.onthemoney.config;

import com.onthemoney.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.cors.CorsUtils;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * Guards every /api route except the auth endpoints and the status healthcheck. Clients present
 * their session token as an "Authorization: Bearer <token>" header; the user is always resolved
 * server-side from the token, never from client-supplied ids.
 */
@Component
public class AuthInterceptor implements HandlerInterceptor {

  private final AuthService authService;

  public AuthInterceptor(AuthService authService) {
    this.authService = authService;
  }

  @Override
  public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler)
      throws IllegalArgumentException {
    // CORS preflight (OPTIONS) carries no Authorization header. Let Spring's
    // CORS machinery answer it; rejecting it here would block every browser
    // request from the web app (the preflight fails, so the real request never
    // fires and fetch rejects with a network-style error).
    if (CorsUtils.isPreFlightRequest(request)) {
      return true;
    }
    String header = request.getHeader("Authorization");
    if (header == null || !header.startsWith("Bearer ")) {
      throw new IllegalArgumentException("Invalid session.");
    }
    var user = authService.validateSession(header.substring("Bearer ".length()).trim());
    // Controllers read the resolved owner via @RequestAttribute("currentUser")
    // so every query is scoped to this user's rows.
    request.setAttribute("currentUser", user);
    return true;
  }
}
