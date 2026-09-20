package com.onthemoney.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.onthemoney.entity.PlaidItemEntity;
import com.onthemoney.service.AuthService;
import com.onthemoney.service.PlaidService;
import com.onthemoney.service.PlaidWebhookVerifier;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class PlaidControllerTest {

  @Autowired private WebApplicationContext context;
  @Autowired private AuthService authService;
  @Autowired private ObjectMapper mapper;

  // The controller's Plaid call must never touch the network in tests.
  @MockBean private PlaidService plaidService;
  @MockBean private PlaidWebhookVerifier webhookVerifier;

  private MockMvc mockMvc;

  @BeforeEach
  void setUpMockMvcWithSession() {
    // Every request carries a valid session token so it passes the AuthInterceptor.
    var session = authService.signup("plaid@test.com", "password123", "Tester");
    mockMvc =
        MockMvcBuilders.webAppContextSetup(context)
            .defaultRequest(get("/").header("Authorization", "Bearer " + session.getToken()))
            .build();
  }

  private String json(Map<String, ?> fields) throws Exception {
    return mapper.writeValueAsString(fields);
  }

  private PlaidItemEntity stubItem() {
    PlaidItemEntity item = new PlaidItemEntity();
    item.setId(1L);
    item.setPlaidItemId("item_123");
    item.setInstitutionName("Test Bank");
    item.setStatus("CONNECTED");
    return item;
  }

  @Nested
  @DisplayName("Get Plaid Link Token")
  class GetPlaidLinkToken {

    @Test
    void returnsLinkToken() throws Exception {
      when(plaidService.createLinkToken(any(), any())).thenReturn("test_link_token");

      mockMvc
          .perform(post("/api/plaid/link_token"))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.link_token").value("test_link_token"));
    }

    @Test
    void updateModeReturnsTokenForExistingItem() throws Exception {
      when(plaidService.createUpdateLinkToken(any(), eq(7L))).thenReturn("update_link_token");

      mockMvc
          .perform(
              post("/api/plaid/link_token/update")
                  .contentType(MediaType.APPLICATION_JSON)
                  .content(json(Map.of("itemId", 7L))))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.link_token").value("update_link_token"));
    }

    @Test
    void updateModeRejectsMissingItemId() throws Exception {
      mockMvc
          .perform(
              post("/api/plaid/link_token/update")
                  .contentType(MediaType.APPLICATION_JSON)
                  .content(json(Map.of())))
          .andExpect(status().isBadRequest());
    }
  }

  @Nested
  @DisplayName("Exchange public token")
  class Exchange {

    @Test
    void exchangesAndReturnsTheLinkedItem() throws Exception {
      PlaidItemEntity item = stubItem();
      when(plaidService.exchangePublicToken(any(), eq("public_token_abc"), any(), any()))
          .thenReturn(item);

      mockMvc
          .perform(
              post("/api/plaid/exchange")
                  .contentType(MediaType.APPLICATION_JSON)
                  .content(json(Map.of("public_token", "public_token_abc"))))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.id").value(1))
          .andExpect(jsonPath("$.institutionName").value("Test Bank"))
          .andExpect(jsonPath("$.status").value("CONNECTED"));
    }

    @Test
    void rejectsMissingPublicToken() throws Exception {
      mockMvc
          .perform(
              post("/api/plaid/exchange")
                  .contentType(MediaType.APPLICATION_JSON)
                  .content(json(Map.of())))
          .andExpect(status().isBadRequest());
    }
  }

  @Nested
  @DisplayName("Sync")
  class SyncItems {

    @Test
    void syncsAllItemsAndReportsCounts() throws Exception {
      when(plaidService.syncAllForUser(any()))
          .thenReturn(List.of(new PlaidService.SyncResult(2, 3, 4, 5)));

      mockMvc
          .perform(post("/api/plaid/sync"))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$[0].accounts").value(2))
          .andExpect(jsonPath("$[0].added").value(3))
          .andExpect(jsonPath("$[0].modified").value(4))
          .andExpect(jsonPath("$[0].removed").value(5));
    }
  }

  @Nested
  @DisplayName("Linked items")
  class Items {

    @Test
    void listsItems() throws Exception {
      when(plaidService.listItemsForUser(any())).thenReturn(List.of(stubItem()));

      mockMvc
          .perform(get("/api/plaid/items"))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.length()").value(1));
    }

    @Test
    void disconnectsItem() throws Exception {
      when(plaidService.disconnect(eq(1L), any())).thenReturn(true);

      mockMvc.perform(delete("/api/plaid/items/1")).andExpect(status().isNoContent());
    }

    @Test
    void disconnectOfUnknownItemIsRejected() throws Exception {
      when(plaidService.disconnect(eq(9L), any())).thenReturn(false);

      mockMvc.perform(delete("/api/plaid/items/9")).andExpect(status().isBadRequest());
    }
  }

  @Nested
  @DisplayName("Webhook")
  class Webhook {

    @Test
    void rejectsBadSignature() throws Exception {
      when(webhookVerifier.verify(any(byte[].class), any())).thenReturn(false);

      mockMvc
          .perform(
              post("/api/plaid/webhook")
                  .contentType(MediaType.APPLICATION_JSON)
                  .header("Plaid-Verification", "garbage.jwt")
                  .content(
                      "{\"webhook_type\":\"TRANSACTIONS\",\"webhook_code\":\"SYNC_UPDATES_AVAILABLE\"}"))
          .andExpect(status().isUnauthorized());
    }

    @Test
    void acceptsVerifiedWebhook() throws Exception {
      when(webhookVerifier.verify(any(byte[].class), any())).thenReturn(true);

      mockMvc
          .perform(
              post("/api/plaid/webhook")
                  .contentType(MediaType.APPLICATION_JSON)
                  .header("Plaid-Verification", "valid.jwt")
                  .content(
                      "{\"webhook_type\":\"TRANSACTIONS\","
                          + "\"webhook_code\":\"SYNC_UPDATES_AVAILABLE\","
                          + "\"item_id\":\"item_123\"}"))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.received").value(true));
    }
  }
}
