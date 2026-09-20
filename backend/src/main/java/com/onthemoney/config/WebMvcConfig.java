package com.onthemoney.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

  private final AuthInterceptor authInterceptor;

  public WebMvcConfig(AuthInterceptor authInterceptor) {
    this.authInterceptor = authInterceptor;
  }

  @Override
  public void addInterceptors(InterceptorRegistry registry) {
    registry
        .addInterceptor(authInterceptor)
        .addPathPatterns("/api/**")
        // Auth endpoints manage their own tokens; status backs the compose healthcheck.
        // Plaid webhooks are verified by their signed Plaid-Verification JWT instead.
        .excludePathPatterns("/api/auth/**", "/api/status", "/api/", "/api/plaid/webhook");
  }
}
