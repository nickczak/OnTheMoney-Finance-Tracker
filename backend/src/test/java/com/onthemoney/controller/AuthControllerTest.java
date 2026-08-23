package com.onthemoney.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AuthControllerTest {

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper mapper;

  private String json(Map<String, String> fields) throws Exception {
    return mapper.writeValueAsString(fields);
  }

  private String signupAndReturnToken(String email) throws Exception {
    String body =
        mockMvc
            .perform(
                post("/api/auth/signup")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        json(
                            Map.of(
                                "email", email, "password", "secret123", "displayName", "Nick"))))
            .andExpect(status().isCreated())
            .andReturn()
            .getResponse()
            .getContentAsString();
    return com.jayway.jsonpath.JsonPath.read(body, "$.token");
  }

  private String tokenBody(String token) throws Exception {
    return json(Map.of("token", token));
  }

  @Nested
  @DisplayName("Signup")
  class Signup {

    @Test
    void returnsSessionWithUser() throws Exception {
      mockMvc
          .perform(
              post("/api/auth/signup")
                  .contentType(MediaType.APPLICATION_JSON)
                  .content(
                      json(
                          Map.of(
                              "email", "a@test.com",
                              "password", "secret123",
                              "displayName", "Nick"))))
          .andExpect(status().isCreated())
          .andExpect(jsonPath("$.token").isNotEmpty())
          .andExpect(jsonPath("$.user.email").value("a@test.com"))
          .andExpect(jsonPath("$.user.displayName").value("Nick"));
    }

    @Test
    void duplicateEmailIsConflict() throws Exception {
      signupAndReturnToken("dup@test.com");
      mockMvc
          .perform(
              post("/api/auth/signup")
                  .contentType(MediaType.APPLICATION_JSON)
                  .content(
                      json(
                          Map.of(
                              "email",
                              "dup@test.com",
                              "password",
                              "secret123",
                              "displayName",
                              "Again"))))
          .andExpect(status().isConflict());
    }

    @Test
    void missingFieldsIsBadRequest() throws Exception {
      mockMvc
          .perform(
              post("/api/auth/signup")
                  .contentType(MediaType.APPLICATION_JSON)
                  .content(json(Map.of("email", "partial@test.com"))))
          .andExpect(status().isBadRequest());
    }
  }

  @Nested
  @DisplayName("Login & session")
  class LoginAndSession {

    @Test
    void loginReturnsSession() throws Exception {
      signupAndReturnToken("login@test.com");
      mockMvc
          .perform(
              post("/api/auth/login")
                  .contentType(MediaType.APPLICATION_JSON)
                  .content(json(Map.of("email", "login@test.com", "password", "secret123"))))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.token").isNotEmpty());
    }

    @Test
    void badPasswordIsUnauthorized() throws Exception {
      signupAndReturnToken("bad@test.com");
      mockMvc
          .perform(
              post("/api/auth/login")
                  .contentType(MediaType.APPLICATION_JSON)
                  .content(json(Map.of("email", "bad@test.com", "password", "wrongpass"))))
          .andExpect(status().isUnauthorized());
    }

    @Test
    void meResolvesUserFromToken() throws Exception {
      String token = signupAndReturnToken("me@test.com");
      mockMvc
          .perform(
              post("/api/auth/me")
                  .contentType(MediaType.APPLICATION_JSON)
                  .content(tokenBody(token)))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.email").value("me@test.com"));
    }

    @Test
    void invalidTokenIsUnauthorized() throws Exception {
      mockMvc
          .perform(
              post("/api/auth/me")
                  .contentType(MediaType.APPLICATION_JSON)
                  .content(tokenBody("not-a-real-token")))
          .andExpect(status().isUnauthorized());
    }

    @Test
    void logoutInvalidatesToken() throws Exception {
      String token = signupAndReturnToken("out@test.com");
      mockMvc
          .perform(
              post("/api/auth/logout")
                  .contentType(MediaType.APPLICATION_JSON)
                  .content(tokenBody(token)))
          .andExpect(status().isOk());
      mockMvc
          .perform(
              post("/api/auth/me")
                  .contentType(MediaType.APPLICATION_JSON)
                  .content(tokenBody(token)))
          .andExpect(status().isUnauthorized());
    }

    @Test
    void refreshExtendsSession() throws Exception {
      String token = signupAndReturnToken("refresh@test.com");
      mockMvc
          .perform(
              post("/api/auth/refresh")
                  .contentType(MediaType.APPLICATION_JSON)
                  .content(tokenBody(token)))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.token").isNotEmpty());
    }
  }

  @Nested
  @DisplayName("Account management")
  class AccountManagement {

    @Test
    void changePasswordThenLoginWithNewPassword() throws Exception {
      String token = signupAndReturnToken("pw@test.com");
      mockMvc
          .perform(
              post("/api/auth/change-password")
                  .contentType(MediaType.APPLICATION_JSON)
                  .content(
                      json(
                          Map.of(
                              "token", token,
                              "oldPassword", "secret123",
                              "newPassword", "newpass456"))))
          .andExpect(status().isOk());
      mockMvc
          .perform(
              post("/api/auth/login")
                  .contentType(MediaType.APPLICATION_JSON)
                  .content(json(Map.of("email", "pw@test.com", "password", "newpass456"))))
          .andExpect(status().isOk());
    }

    @Test
    void wrongOldPasswordIsUnauthorized() throws Exception {
      String token = signupAndReturnToken("wrongpw@test.com");
      mockMvc
          .perform(
              post("/api/auth/change-password")
                  .contentType(MediaType.APPLICATION_JSON)
                  .content(
                      json(
                          Map.of(
                              "token", token,
                              "oldPassword", "nope",
                              "newPassword", "newpass456"))))
          .andExpect(status().isUnauthorized());
    }

    @Test
    void updateProfileChangesDisplayNameAndEmail() throws Exception {
      String token = signupAndReturnToken("profile@test.com");
      mockMvc
          .perform(
              post("/api/auth/update")
                  .contentType(MediaType.APPLICATION_JSON)
                  .content(
                      json(
                          Map.of(
                              "token", token,
                              "displayName", "Renamed",
                              "email", "renamed@test.com"))))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.displayName").value("Renamed"))
          .andExpect(jsonPath("$.email").value("renamed@test.com"));
    }

    @Test
    void deleteAccountRemovesUser() throws Exception {
      String token = signupAndReturnToken("delete@test.com");
      mockMvc
          .perform(
              post("/api/auth/delete-account")
                  .contentType(MediaType.APPLICATION_JSON)
                  .content(tokenBody(token)))
          .andExpect(status().isOk());
      mockMvc
          .perform(
              post("/api/auth/me")
                  .contentType(MediaType.APPLICATION_JSON)
                  .content(tokenBody(token)))
          .andExpect(status().isUnauthorized());
    }
  }

  @Nested
  @DisplayName("Protected endpoints")
  class ProtectedEndpoints {

    @Test
    void rejectsRequestsWithoutToken() throws Exception {
      mockMvc.perform(get("/api/net-worth")).andExpect(status().isUnauthorized());
    }

    @Test
    void rejectsRequestsOutsideAuthNamespaceWithoutToken() throws Exception {
      mockMvc.perform(get("/api/accounts")).andExpect(status().isUnauthorized());
    }
  }
}
