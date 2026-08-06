package com.onthemoney.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class FinnhubServiceTest {

  private static final String QUOTE_BODY =
      "{\"c\":100.0,\"d\":1.0,\"dp\":1.01,\"h\":101.0,\"l\":99.0,\"o\":99.5,\"pc\":99.0}";

  private ObjectMapper mapper;
  private HttpClient httpClient;
  private FinnhubService service;

  @BeforeEach
  void setUp() {
    mapper = new ObjectMapper();
    httpClient = mock(HttpClient.class);
    service = new FinnhubService("test-key", mapper, httpClient, 30_000, 600_000);
  }

  private void stubResponse(int status, String body) throws Exception {
    HttpResponse<String> response = mock(HttpResponse.class);
    when(response.statusCode()).thenReturn(status);
    when(response.body()).thenReturn(body);
    when(httpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
        .thenReturn(response);
  }

  @Test
  void getQuoteMapsFinnhubFieldsAndCachesWithinTtl() throws Exception {
    stubResponse(200, QUOTE_BODY);

    JsonNode first = service.getQuote("AAPL");
    assertEquals("AAPL", first.path("symbol").asText());
    assertEquals(100.0, first.path("currentPrice").asDouble());
    assertEquals(1.01, first.path("percentChange").asDouble());

    JsonNode second = service.getQuote("AAPL"); // cache hit — no second HTTP call
    assertEquals(100.0, second.path("currentPrice").asDouble());
    verify(httpClient, times(1)).send(any(), any());
  }

  @Test
  void getQuoteRefetchesWhenCacheIsExpired() throws Exception {
    // TTL 0 means every read is stale, so each call must hit the wire.
    service = new FinnhubService("test-key", mapper, httpClient, 0, 600_000);
    stubResponse(200, QUOTE_BODY);

    service.getQuote("AAPL");
    service.getQuote("AAPL");
    verify(httpClient, times(2)).send(any(), any());
  }

  @Test
  void getQuoteThrowsOnNon200() throws Exception {
    stubResponse(429, "{\"error\":\"rate limit exceeded\"}");

    assertThrows(IOException.class, () -> service.getQuote("AAPL"));
  }

  @Test
  void getQuoteWithProfileFallsBackToSymbolWhenProfileFails() throws Exception {
    when(httpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
        .thenAnswer(
            inv -> {
              String url = ((HttpRequest) inv.getArgument(0)).uri().toString();
              HttpResponse<String> response = mock(HttpResponse.class);
              when(response.statusCode()).thenReturn(200);
              when(response.body()).thenReturn(url.contains("/quote") ? QUOTE_BODY : "{}");
              return response;
            });

    JsonNode quote = service.getQuoteWithProfile("AAPL");
    assertEquals("AAPL", quote.path("symbol").asText());
    assertEquals("AAPL", quote.path("name").asText());
  }
}
