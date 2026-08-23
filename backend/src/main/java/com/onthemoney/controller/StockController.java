package com.onthemoney.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.onthemoney.entity.UserEntity;
import com.onthemoney.entity.WatchlistEntity;
import com.onthemoney.repository.WatchlistRepository;
import com.onthemoney.service.FinnhubService;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/stocks")
public class StockController {

  private static final Logger log = LoggerFactory.getLogger(StockController.class);
  private static final Set<String> RESOLUTIONS = Set.of("1", "5", "15", "30", "60", "D", "W", "M");

  private final FinnhubService finnhubService;
  private final WatchlistRepository watchlistRepo;
  private final ObjectMapper mapper;

  public StockController(
      FinnhubService finnhubService, WatchlistRepository watchlistRepo, ObjectMapper mapper) {
    this.finnhubService = finnhubService;
    this.watchlistRepo = watchlistRepo;
    this.mapper = mapper;
  }

  @GetMapping("/quote")
  public JsonNode getQuote(@RequestParam String symbol) {
    try {
      return finnhubService.getQuoteWithProfile(symbol);
    } catch (Exception e) {
      // Don't propagate e.getMessage(): Finnhub URLs embed the API key, so the
      // detail could leak it. Log the root cause server-side instead.
      log.error("Failed to fetch quote for {}", symbol, e);
      throw new ResponseStatusException(
          HttpStatus.BAD_GATEWAY, "Failed to fetch quote from upstream service");
    }
  }

  @GetMapping("/search")
  public JsonNode search(@RequestParam String q) {
    try {
      return finnhubService.searchSymbols(q);
    } catch (Exception e) {
      log.error("Finnhub search failed for q={}", q, e);
      throw new ResponseStatusException(
          HttpStatus.BAD_GATEWAY, "Search failed on upstream service");
    }
  }

  @GetMapping("/candles")
  public JsonNode getCandles(
      @RequestParam String symbol,
      @RequestParam(defaultValue = "D") String resolution,
      @RequestParam long from,
      @RequestParam long to) {
    if (!RESOLUTIONS.contains(resolution)) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "invalid resolution, expected one of " + RESOLUTIONS);
    }
    if (from <= 0 || to <= 0 || from >= to) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "invalid time range: require 0 < from < to");
    }
    try {
      return finnhubService.getCandles(symbol, resolution, from, to);
    } catch (Exception e) {
      log.error("Failed to fetch candles for {} ({})", symbol, resolution, e);
      throw new ResponseStatusException(
          HttpStatus.BAD_GATEWAY, "Failed to fetch candles from upstream service");
    }
  }

  @GetMapping("/overview")
  public JsonNode getOverview() {
    String[] symbols = {"SPY", "QQQ", "DIA", "IWM", "VIX"};
    String[] names = {"S&P 500", "NASDAQ", "Dow Jones", "Russell 2000", "Volatility"};
    JsonNode indices = mapper.createArrayNode();
    for (int i = 0; i < symbols.length; i++) {
      try {
        JsonNode quote = finnhubService.getQuote(symbols[i]);
        ((ObjectNode) quote).put("name", names[i]);
        ((ArrayNode) indices).add(quote);
      } catch (Exception e) {
        // One bad symbol shouldn't 502 the whole overview.
        log.warn("Failed to fetch overview quote for {}; skipping", symbols[i], e);
      }
    }
    JsonNode result = mapper.createObjectNode();
    ((ObjectNode) result).set("indices", indices);
    return result;
  }

  @GetMapping("/watchlist")
  public List<JsonNode> getWatchlist(@RequestAttribute("currentUser") UserEntity currentUser) {
    List<JsonNode> result = new ArrayList<>();
    for (WatchlistEntity item : watchlistRepo.findByUser(currentUser)) {
      try {
        JsonNode quote = finnhubService.getQuoteWithProfile(item.getSymbol());
        ((ObjectNode) quote)
            .put("addedDate", item.getAddedDate() != null ? item.getAddedDate().toString() : "");
        result.add(quote);
      } catch (Exception e) {
        JsonNode fallback = mapper.createObjectNode();
        ((ObjectNode) fallback).put("symbol", item.getSymbol());
        ((ObjectNode) fallback).put("name", item.getSymbol());
        ((ObjectNode) fallback).put("currentPrice", 0);
        ((ObjectNode) fallback).put("change", 0);
        ((ObjectNode) fallback).put("percentChange", 0);
        result.add(fallback);
      }
    }
    return result;
  }

  @PostMapping("/watchlist")
  @ResponseStatus(HttpStatus.CREATED)
  public void addToWatchlist(
      @RequestAttribute("currentUser") UserEntity currentUser, @RequestParam String symbol) {
    if (watchlistRepo
        .findByUserAndSymbolIgnoreCase(currentUser, symbol.toUpperCase())
        .isPresent()) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Symbol already in watchlist");
    }
    WatchlistEntity entity = new WatchlistEntity();
    entity.setUser(currentUser);
    entity.setSymbol(symbol.toUpperCase());
    entity.setAddedDate(LocalDateTime.now());
    watchlistRepo.save(entity);
  }

  @DeleteMapping("/watchlist/{symbol}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void removeFromWatchlist(
      @RequestAttribute("currentUser") UserEntity currentUser, @PathVariable String symbol) {
    watchlistRepo
        .findByUserAndSymbolIgnoreCase(currentUser, symbol.toUpperCase())
        .ifPresent(watchlistRepo::delete);
  }
}
