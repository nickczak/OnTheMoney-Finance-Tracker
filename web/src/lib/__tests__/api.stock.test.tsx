import { vi } from "vitest";
import { mockFetchOnce, mockFetchRejects } from "./test-utils";
import type { StockQuote } from "@/lib/api";
import {
  fetchStockQuote,
  searchStocks,
  fetchStockOverview,
  fetchStockCandles,
  fetchWatchlist,
  addToWatchlist,
  removeFromWatchlist,
} from "@/lib/api";

function quote(overrides: Partial<StockQuote> = {}) {
  return {
    symbol: "AAPL",
    name: "Apple Inc.",
    currentPrice: 228.4,
    change: 1.1,
    percentChange: 0.5,
    high: 230.0,
    low: 225.0,
    open: 227.0,
    previousClose: 227.3,
    ...overrides,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("fetchStockQuote", () => {
  it("returns a live quote", async () => {
    const data = quote();
    mockFetchOnce(data);
    await expect(fetchStockQuote("AAPL")).resolves.toEqual(data);
  });

  it("requests the symbol as a query param", async () => {
    const spy = mockFetchOnce(quote());
    await fetchStockQuote("AAPL");
    const [url] = spy.mock.calls[0];
    expect(url).toContain("/api/stocks/quote?symbol=AAPL");
  });

  it("throws on upstream error", async () => {
    mockFetchOnce({ error: "upstream" }, false, 502);
    await expect(fetchStockQuote("AAPL")).rejects.toThrow("HTTP 502");
  });

  it("rejects on network failure", async () => {
    mockFetchRejects();
    await expect(fetchStockQuote("AAPL")).rejects.toThrow(
      "Network request failed",
    );
  });
});

describe("searchStocks", () => {
  it("returns matching symbols", async () => {
    const results = [
      {
        symbol: "AAPL",
        description: "Apple Inc.",
        type: "Common Stock",
        displaySymbol: "AAPL",
      },
    ];
    mockFetchOnce(results);
    await expect(searchStocks("apple")).resolves.toEqual(results);
  });

  it("encodes the query", async () => {
    const spy = mockFetchOnce([]);
    await searchStocks("Apple Inc.");
    const [url] = spy.mock.calls[0];
    expect(url).toContain("q=Apple%20Inc.");
  });
});

describe("fetchStockOverview", () => {
  it("returns the market indices", async () => {
    const data = { indices: [quote({ symbol: "SPX", name: "S&P 500" })] };
    mockFetchOnce(data);
    await expect(fetchStockOverview()).resolves.toEqual(data);
  });
});

describe("fetchStockCandles", () => {
  it("passes symbol, resolution, and time range as query params", async () => {
    const candles = { c: [], h: [], l: [], o: [], v: [], t: [], s: "ok" };
    const spy = mockFetchOnce(candles);
    await fetchStockCandles("AAPL", "D", 1700000000, 1730000000);
    const [url] = spy.mock.calls[0];
    expect(url).toContain("symbol=AAPL");
    expect(url).toContain("resolution=D");
    expect(url).toContain("from=1700000000");
    expect(url).toContain("to=1730000000");
  });
});

describe("fetchWatchlist", () => {
  it("returns watched symbols with quotes", async () => {
    const data = [quote()];
    mockFetchOnce(data);
    await expect(fetchWatchlist()).resolves.toEqual(data);
  });
});

describe("addToWatchlist", () => {
  it("POSTs the symbol as a query param", async () => {
    const spy = mockFetchOnce(null);
    await addToWatchlist("AAPL");
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining("/api/stocks/watchlist?symbol=AAPL"),
      expect.objectContaining({ method: "POST" }),
    );
  });
});

describe("removeFromWatchlist", () => {
  it("DELETEs the symbol", async () => {
    const spy = mockFetchOnce(null);
    await removeFromWatchlist("AAPL");
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining("/api/stocks/watchlist/AAPL"),
      expect.objectContaining({ method: "DELETE" }),
    );
  });
});
