package com.onthemoney.controller;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.onthemoney.service.AuthService;
import com.onthemoney.service.FinnhubService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class StockControllerTest {

  @Autowired private WebApplicationContext context;
  @Autowired private ObjectMapper mapper;
  @Autowired private AuthService authService;
  @MockBean private FinnhubService finnhubService;

  private MockMvc mockMvc;

  @BeforeEach
  void setUpMockMvcWithSession() {
    // Every request carries a valid session token so it passes the AuthInterceptor.
    String token = authService.signup("stocks@test.com", "password123", "Tester").getToken();
    mockMvc =
        MockMvcBuilders.webAppContextSetup(context)
            .defaultRequest(get("/").header("Authorization", "Bearer " + token))
            .build();
  }

  private ObjectNode quote(String symbol, double price) {
    ObjectNode node = mapper.createObjectNode();
    node.put("symbol", symbol);
    node.put("currentPrice", price);
    node.put("change", 0);
    node.put("percentChange", 0);
    node.put("name", symbol);
    return node;
  }

  @Test
  void quoteReturnsUpstreamData() throws Exception {
    when(finnhubService.getQuoteWithProfile("AAPL")).thenReturn(quote("AAPL", 250.5));

    mockMvc
        .perform(get("/api/stocks/quote").param("symbol", "AAPL"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.currentPrice").value(250.5))
        .andExpect(jsonPath("$.name").value("AAPL"));
  }

  @Test
  void quoteSurfacesBadGatewayOnUpstreamFailure() throws Exception {
    when(finnhubService.getQuoteWithProfile(anyString())).thenThrow(new RuntimeException("boom"));

    mockMvc
        .perform(get("/api/stocks/quote").param("symbol", "AAPL"))
        .andExpect(status().isBadGateway());
  }

  @Test
  void searchReturnsSymbols() throws Exception {
    ObjectNode hit = mapper.createObjectNode();
    hit.put("symbol", "AAPL");
    hit.put("description", "Apple Inc.");
    com.fasterxml.jackson.databind.node.ArrayNode result = mapper.createArrayNode();
    result.add(hit);
    when(finnhubService.searchSymbols("apple")).thenReturn(result);

    mockMvc
        .perform(get("/api/stocks/search").param("q", "apple"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].symbol").value("AAPL"));
  }

  @Test
  void candlesRejectsInvalidResolution() throws Exception {
    mockMvc
        .perform(
            get("/api/stocks/candles")
                .param("symbol", "AAPL")
                .param("resolution", "Z")
                .param("from", "1")
                .param("to", "2"))
        .andExpect(status().isBadRequest());
  }

  @Test
  void candlesRejectsInvertedTimeRange() throws Exception {
    mockMvc
        .perform(
            get("/api/stocks/candles")
                .param("symbol", "AAPL")
                .param("resolution", "D")
                .param("from", "10")
                .param("to", "5"))
        .andExpect(status().isBadRequest());
  }

  @Test
  void candlesReturnsData() throws Exception {
    ObjectNode candles = mapper.createObjectNode();
    candles.put("status", "ok");
    when(finnhubService.getCandles("AAPL", "D", 10L, 20L)).thenReturn(candles);

    mockMvc
        .perform(
            get("/api/stocks/candles")
                .param("symbol", "AAPL")
                .param("resolution", "D")
                .param("from", "10")
                .param("to", "20"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("ok"));
  }

  @Test
  void overviewReturnsIndicesWithoutQuota() throws Exception {
    when(finnhubService.getQuote(anyString())).thenReturn(quote("SPY", 500.0));

    mockMvc
        .perform(get("/api/stocks/overview"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.indices").isArray());
  }

  @Test
  void overviewSkipsFailedSymbols() throws Exception {
    when(finnhubService.getQuote(anyString())).thenThrow(new RuntimeException("quota exceeded"));

    mockMvc
        .perform(get("/api/stocks/overview"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.indices").isEmpty());
  }

  @Test
  void watchlistStartsEmpty() throws Exception {
    mockMvc
        .perform(get("/api/stocks/watchlist"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$").isEmpty());
  }

  @Test
  void addsToWatchlistAndListsIt() throws Exception {
    mockMvc
        .perform(post("/api/stocks/watchlist").param("symbol", "aapl"))
        .andExpect(status().isCreated());

    when(finnhubService.getQuoteWithProfile("AAPL")).thenReturn(quote("AAPL", 250.5));

    mockMvc
        .perform(get("/api/stocks/watchlist"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].symbol").value("AAPL"))
        .andExpect(jsonPath("$[0].addedDate").isNotEmpty());
  }

  @Test
  void rejectsDuplicateWatchlistSymbol() throws Exception {
    mockMvc
        .perform(post("/api/stocks/watchlist").param("symbol", "AAPL"))
        .andExpect(status().isCreated());

    mockMvc
        .perform(post("/api/stocks/watchlist").param("symbol", "aapl"))
        .andExpect(status().isConflict());
  }

  @Test
  void removesFromWatchlist() throws Exception {
    mockMvc
        .perform(post("/api/stocks/watchlist").param("symbol", "AAPL"))
        .andExpect(status().isCreated());

    mockMvc.perform(delete("/api/stocks/watchlist/AAPL")).andExpect(status().isNoContent());

    mockMvc
        .perform(get("/api/stocks/watchlist"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$").isEmpty());
  }

  @Test
  void watchlistFallsBackWhenQuoteFails() throws Exception {
    mockMvc
        .perform(post("/api/stocks/watchlist").param("symbol", "AAPL"))
        .andExpect(status().isCreated());

    when(finnhubService.getQuoteWithProfile(anyString()))
        .thenThrow(new RuntimeException("upstream down"));

    mockMvc
        .perform(get("/api/stocks/watchlist"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].symbol").value("AAPL"))
        .andExpect(jsonPath("$[0].currentPrice").value(0));
  }
}
