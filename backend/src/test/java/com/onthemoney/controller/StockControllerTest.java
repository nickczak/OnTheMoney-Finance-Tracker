package com.onthemoney.controller;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.onthemoney.entity.WatchlistEntity;
import com.onthemoney.repository.WatchlistRepository;
import com.onthemoney.service.FinnhubService;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(StockController.class)
class StockControllerTest {

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper mapper;

  @MockBean private FinnhubService finnhubService;
  @MockBean private WatchlistRepository watchlistRepo;

  private ObjectNode quoteNode(String symbol, double price) {
    ObjectNode node = mapper.createObjectNode();
    node.put("symbol", symbol);
    node.put("currentPrice", price);
    node.put("change", 1.0);
    node.put("percentChange", 1.5);
    return node;
  }

  @Test
  void quoteReturnsQuoteWithProfile() throws Exception {
    when(finnhubService.getQuoteWithProfile("AAPL")).thenReturn(quoteNode("AAPL", 150.0));

    mockMvc
        .perform(get("/api/stocks/quote").param("symbol", "AAPL"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.symbol").value("AAPL"))
        .andExpect(jsonPath("$.currentPrice").value(150.0));
  }

  @Test
  void quoteFailureReturnsGenericBadGateway() throws Exception {
    // Even if the underlying exception carries sensitive detail (Finnhub URLs
    // embed the API key), the client must only see a generic message.
    when(finnhubService.getQuoteWithProfile("AAPL"))
        .thenThrow(new RuntimeException("boom secret-detail"));

    mockMvc
        .perform(get("/api/stocks/quote").param("symbol", "AAPL"))
        .andExpect(status().isBadGateway())
        .andExpect(jsonPath("$.error").value("Failed to fetch quote from upstream service"));
  }

  @Test
  void searchReturnsResults() throws Exception {
    ObjectNode result = mapper.createArrayNode().addObject();
    result.put("symbol", "AAPL");
    result.put("description", "APPLE INC");
    when(finnhubService.searchSymbols("apple")).thenReturn(result);

    mockMvc
        .perform(get("/api/stocks/search").param("q", "apple"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].symbol").value("AAPL"));
  }

  @Test
  void rejectsInvalidCandlesResolution() throws Exception {
    mockMvc
        .perform(
            get("/api/stocks/candles")
                .param("symbol", "AAPL")
                .param("resolution", "Z")
                .param("from", "1700000000")
                .param("to", "1730000000"))
        .andExpect(status().isBadRequest());
  }

  @Test
  void rejectsInvalidCandlesTimeRange() throws Exception {
    mockMvc
        .perform(
            get("/api/stocks/candles")
                .param("symbol", "AAPL")
                .param("resolution", "D")
                .param("from", "1730000000")
                .param("to", "1700000000"))
        .andExpect(status().isBadRequest());
  }

  @Test
  void overviewSkipsFailedSymbols() throws Exception {
    when(finnhubService.getQuote("SPY")).thenReturn(quoteNode("SPY", 100.0));
    when(finnhubService.getQuote("QQQ")).thenThrow(new RuntimeException("upstream down"));
    when(finnhubService.getQuote("DIA")).thenReturn(quoteNode("DIA", 300.0));
    when(finnhubService.getQuote("IWM")).thenReturn(quoteNode("IWM", 200.0));
    when(finnhubService.getQuote("VIX")).thenReturn(quoteNode("VIX", 15.0));

    mockMvc
        .perform(get("/api/stocks/overview"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.indices.length()").value(4));
  }

  @Test
  void watchlistRejectsDuplicateSymbol() throws Exception {
    WatchlistEntity existing = new WatchlistEntity();
    existing.setSymbol("AAPL");
    when(watchlistRepo.findBySymbol("AAPL")).thenReturn(Optional.of(existing));

    mockMvc
        .perform(post("/api/stocks/watchlist").param("symbol", "aapl"))
        .andExpect(status().isConflict());
  }

  @Test
  void watchlistRemovalIgnoresMissingSymbol() throws Exception {
    when(watchlistRepo.findBySymbol("AAPL")).thenReturn(Optional.empty());

    mockMvc.perform(delete("/api/stocks/watchlist/AAPL")).andExpect(status().isNoContent());
  }
}
