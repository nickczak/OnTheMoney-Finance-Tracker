package com.onthemoney.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class FinnhubService {

  private final String apiKey;
  private final HttpClient httpClient;
  private final ObjectMapper mapper;

  public FinnhubService(@Value("${finnhub.api-key}") String apiKey, ObjectMapper mapper) {
    this.apiKey = apiKey;
    this.mapper = mapper;
    this.httpClient = HttpClient.newHttpClient();
  }

  public JsonNode getQuote(String symbol) throws Exception {
    String url = "https://finnhub.io/api/v1/quote?symbol=" + symbol + "&token=" + apiKey;
    HttpRequest request = HttpRequest.newBuilder().uri(URI.create(url)).build();
    HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
    JsonNode body = mapper.readTree(response.body());
    JsonNode node = mapper.createObjectNode();
    ((ObjectNode) node).put("symbol", symbol);
    node = mergeQuote(node, body);
    return node;
  }

  public JsonNode searchSymbols(String query) throws Exception {
    String url = "https://finnhub.io/api/v1/search?q=" + query + "&token=" + apiKey;
    HttpRequest request = HttpRequest.newBuilder().uri(URI.create(url)).build();
    HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
    JsonNode body = mapper.readTree(response.body());
    return body.path("result");
  }

  public JsonNode getProfile(String symbol) throws Exception {
    String url = "https://finnhub.io/api/v1/stock/profile2?symbol=" + symbol + "&token=" + apiKey;
    HttpRequest request = HttpRequest.newBuilder().uri(URI.create(url)).build();
    HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
    return mapper.readTree(response.body());
  }

  public JsonNode getQuoteWithProfile(String symbol) throws Exception {
    JsonNode quote = getQuote(symbol);
    try {
      JsonNode profile = getProfile(symbol);
      ((com.fasterxml.jackson.databind.node.ObjectNode) quote)
          .put("name", profile.path("name").asText(symbol));
    } catch (Exception ignored) {
      ((com.fasterxml.jackson.databind.node.ObjectNode) quote).put("name", symbol);
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
    HttpRequest request = HttpRequest.newBuilder().uri(URI.create(url)).build();
    HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
    return mapper.readTree(response.body());
  }

  private JsonNode mergeQuote(JsonNode target, JsonNode src) {
    ObjectNode node = (ObjectNode) target;
    node.put("currentPrice", src.path("c").asDouble());
    node.put("change", src.path("d").asDouble());
    node.put("percentChange", src.path("dp").asDouble());
    node.put("high", src.path("h").asDouble());
    node.put("low", src.path("l").asDouble());
    node.put("open", src.path("o").asDouble());
    node.put("previousClose", src.path("pc").asDouble());
    return node;
  }
}
