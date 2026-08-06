package com.onthemoney.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class FinnhubService {

  private static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(5);
  private static final Duration REQUEST_TIMEOUT = Duration.ofSeconds(10);
  private static final long QUOTE_TTL_MS = 30_000;
  private static final long PROFILE_TTL_MS = 600_000;

  private final String apiKey;
  private final HttpClient httpClient;
  private final ObjectMapper mapper;
  private final long quoteTtlMs;
  private final long profileTtlMs;
  // Finnhub's free tier is 60 calls/minute per key; quotes change slowly, so a
  // short TTL cache keeps the watchlist/overview endpoints from burning quota.
  private final ConcurrentHashMap<String, CacheEntry> quoteCache = new ConcurrentHashMap<>();
  private final ConcurrentHashMap<String, CacheEntry> profileCache = new ConcurrentHashMap<>();

  @Autowired
  public FinnhubService(@Value("${finnhub.api-key}") String apiKey, ObjectMapper mapper) {
    this(
        apiKey,
        mapper,
        HttpClient.newBuilder().connectTimeout(CONNECT_TIMEOUT).build(),
        QUOTE_TTL_MS,
        PROFILE_TTL_MS);
  }

  // Visible for testing: allows injecting a fake HttpClient and short TTLs.
  FinnhubService(
      String apiKey,
      ObjectMapper mapper,
      HttpClient httpClient,
      long quoteTtlMs,
      long profileTtlMs) {
    this.apiKey = apiKey;
    this.mapper = mapper;
    this.httpClient = httpClient;
    this.quoteTtlMs = quoteTtlMs;
    this.profileTtlMs = profileTtlMs;
  }

  public JsonNode getQuote(String symbol) throws Exception {
    CacheEntry cached = quoteCache.get(symbol);
    long now = System.currentTimeMillis();
    if (cached != null && now - cached.timestamp < quoteTtlMs) {
      return cached.node.deepCopy();
    }
    String url = "https://finnhub.io/api/v1/quote?symbol=" + symbol + "&token=" + apiKey;
    JsonNode body = fetch(url);
    JsonNode node = mapper.createObjectNode();
    ((ObjectNode) node).put("symbol", symbol);
    mergeQuote(node, body);
    quoteCache.put(symbol, new CacheEntry(node, now));
    return node;
  }

  public JsonNode searchSymbols(String query) throws Exception {
    String url = "https://finnhub.io/api/v1/search?q=" + query + "&token=" + apiKey;
    JsonNode body = fetch(url);
    return body.path("result");
  }

  public JsonNode getProfile(String symbol) throws Exception {
    CacheEntry cached = profileCache.get(symbol);
    long now = System.currentTimeMillis();
    if (cached != null && now - cached.timestamp < profileTtlMs) {
      return cached.node.deepCopy();
    }
    String url = "https://finnhub.io/api/v1/stock/profile2?symbol=" + symbol + "&token=" + apiKey;
    JsonNode node = fetch(url);
    profileCache.put(symbol, new CacheEntry(node, now));
    return node;
  }

  public JsonNode getQuoteWithProfile(String symbol) throws Exception {
    JsonNode quote = getQuote(symbol);
    try {
      JsonNode profile = getProfile(symbol);
      ((ObjectNode) quote).put("name", profile.path("name").asText(symbol));
    } catch (Exception ignored) {
      ((ObjectNode) quote).put("name", symbol);
    }
    return quote;
  }

  public JsonNode getCandles(String symbol, String resolution, long from, long to)
      throws Exception {
    String url =
        "https://finnhub.io/api/v1/stock/candle?symbol="
            + symbol
            + "&resolution="
            + resolution
            + "&from="
            + from
            + "&to="
            + to
            + "&token="
            + apiKey;
    return fetch(url);
  }

  private JsonNode fetch(String url) throws IOException {
    HttpRequest request =
        HttpRequest.newBuilder().uri(URI.create(url)).timeout(REQUEST_TIMEOUT).build();
    HttpResponse<String> response;
    try {
      response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
      throw new IOException("interrupted while calling Finnhub", e);
    }
    if (response.statusCode() != 200) {
      throw new IOException("Finnhub returned HTTP " + response.statusCode());
    }
    return mapper.readTree(response.body());
  }

  private void mergeQuote(JsonNode target, JsonNode src) {
    ObjectNode node = (ObjectNode) target;
    node.put("currentPrice", src.path("c").asDouble());
    node.put("change", src.path("d").asDouble());
    node.put("percentChange", src.path("dp").asDouble());
    node.put("high", src.path("h").asDouble());
    node.put("low", src.path("l").asDouble());
    node.put("open", src.path("o").asDouble());
    node.put("previousClose", src.path("pc").asDouble());
  }

  private record CacheEntry(JsonNode node, long timestamp) {}
}
