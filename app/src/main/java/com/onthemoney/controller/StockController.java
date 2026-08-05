package com.onthemoney.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.onthemoney.entity.WatchlistEntity;
import com.onthemoney.repository.WatchlistRepository;
import com.onthemoney.service.FinnhubService;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/stocks")
public class StockController {

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
      throw new ResponseStatusException(
          HttpStatus.BAD_GATEWAY, "Failed to fetch quote: " + e.getMessage());
    }
  }

  @GetMapping("/search")
  public JsonNode search(@RequestParam String q) {
    try {
      return finnhubService.searchSymbols(q);
    } catch (Exception e) {
      throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Search failed: " + e.getMessage());
    }
  }

  @GetMapping("/candles")
  public JsonNode getCandles(
      @RequestParam String symbol,
      @RequestParam(defaultValue = "D") String resolution,
      @RequestParam long from,
      @RequestParam long to) {
    try {
      return finnhubService.getCandles(symbol, resolution, from, to);
    } catch (Exception e) {
      throw new ResponseStatusException(
          HttpStatus.BAD_GATEWAY, "Failed to fetch candles: " + e.getMessage());
    }
  }

  @GetMapping("/overview")
  public JsonNode getOverview() {
    try {
      String[] symbols = {"SPY", "QQQ", "DIA", "IWM", "VIX"};
      String[] names = {"S&P 500", "NASDAQ", "Dow Jones", "Russell 2000", "Volatility"};
      JsonNode indices = mapper.createArrayNode();
      for (int i = 0; i < symbols.length; i++) {
        JsonNode quote = finnhubService.getQuote(symbols[i]);
        ((ObjectNode) quote).put("name", names[i]);
        ((ArrayNode) indices).add(quote);
      }
      JsonNode result = mapper.createObjectNode();
      ((ObjectNode) result).set("indices", indices);
      return result;
    } catch (Exception e) {
      throw new ResponseStatusException(
          HttpStatus.BAD_GATEWAY, "Failed to fetch overview: " + e.getMessage());
    }
  }

  @GetMapping("/watchlist")
  public List<JsonNode> getWatchlist() {
    List<JsonNode> result = new ArrayList<>();
    for (WatchlistEntity item : watchlistRepo.findAll()) {
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
  public void addToWatchlist(@RequestParam String symbol) {
    if (watchlistRepo.findBySymbol(symbol.toUpperCase()).isPresent()) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Symbol already in watchlist");
    }
    WatchlistEntity entity = new WatchlistEntity();
    entity.setSymbol(symbol.toUpperCase());
    entity.setAddedDate(LocalDateTime.now());
    watchlistRepo.save(entity);
  }

  @DeleteMapping("/watchlist/{symbol}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void removeFromWatchlist(@PathVariable String symbol) {
    watchlistRepo.findBySymbol(symbol.toUpperCase()).ifPresent(watchlistRepo::delete);
  }
}
