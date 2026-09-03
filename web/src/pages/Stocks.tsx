import { useCallback, useEffect, useState } from "react";
import { Loader2, Star } from "lucide-react";

import { useResponsiveLayout } from "@/lib/responsive";
import {
  fetchStockOverview,
  fetchWatchlist,
  searchStocks,
  addToWatchlist,
  removeFromWatchlist,
  fetchStockQuote,
  type StockQuote,
  type StockSearchResult,
} from "@/lib/api";
import { formatMoney } from "@/lib/format";

export default function Stocks() {
  const { isDesktop } = useResponsiveLayout();

  const [indices, setIndices] = useState<StockQuote[]>([]);
  const [watchlist, setWatchlist] = useState<StockQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<StockSearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  const [detailQuote, setDetailQuote] = useState<StockQuote | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [overview, wl] = await Promise.all([
        fetchStockOverview(),
        fetchWatchlist().catch(() => []),
      ]);
      setIndices(overview.indices);
      setWatchlist(wl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load stock data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const doSearch = useCallback(async () => {
    const q = query.trim();
    if (q.length < 1) return;
    setSearching(true);
    try {
      const res = await searchStocks(q);
      setResults(res);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, [query]);

  const openDetail = useCallback(async (symbol: string) => {
    setLoadingDetail(true);
    setDetailOpen(true);
    try {
      const q = await fetchStockQuote(symbol);
      setDetailQuote(q);
    } catch {
      setDetailQuote(null);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  const toggleWatchlist = useCallback(
    async (symbol: string) => {
      const inList = watchlist.some((w) => w.symbol === symbol);
      try {
        if (inList) {
          await removeFromWatchlist(symbol);
          setWatchlist((prev) => prev.filter((w) => w.symbol !== symbol));
        } else {
          await addToWatchlist(symbol);
          const q = await fetchStockQuote(symbol);
          setWatchlist((prev) => [...prev, q]);
        }
      } catch {
        // silently fail
      }
    },
    [watchlist],
  );

  const quoteColor = (change: number) => (change >= 0 ? "#067647" : "#d92d20");
  const container = `bg-bg p-4 pb-20 ${isDesktop ? "max-w-[1100px] mx-auto px-6" : ""}`;

  if (loading) {
    return (
      <div className="min-h-full bg-bg flex items-center justify-center p-6">
        <Loader2 className="animate-spin text-muted" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-full bg-bg flex items-center justify-center p-6">
        <div className="font-serif text-danger">{error}</div>
      </div>
    );
  }

  return (
    <>
      <div className={container}>
        <div className="font-serif text-lg font-bold text-text">
          Market Overview
        </div>
        {indices.length === 0 ? (
          <div className="font-serif text-muted italic p-4 text-center">
            No market data available.
          </div>
        ) : (
          <div className="flex flex-row flex-wrap gap-2 mt-3">
            {indices.map((idx) => (
              <button
                key={idx.symbol}
                type="button"
                onClick={() => openDetail(idx.symbol)}
                className="bg-surface border border-border rounded-xl p-3 min-w-[100px] flex-grow text-left hover:border-brand/40 hover:bg-surface-hover"
              >
                <div className="font-serif text-[11px] text-muted uppercase tracking-wide">
                  {idx.name}
                </div>
                <div className="font-serif text-base font-bold text-text mt-1">
                  ${formatMoney(idx.currentPrice)}
                </div>
                <div
                  className="font-serif text-xs font-semibold mt-0.5"
                  style={{ color: quoteColor(idx.percentChange) }}
                >
                  {idx.percentChange >= 0 ? "+" : ""}
                  {idx.percentChange.toFixed(2)}%
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="mt-7">
          <div className="font-serif text-lg font-bold text-text">
            Search Stocks
          </div>
          <div className="flex flex-row gap-2 mt-3">
            <input
              className="flex-1 font-serif text-[15px] text-text border border-border rounded-xl py-2.5 px-3.5 bg-surface outline-none placeholder:text-muted focus:border-brand"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && doSearch()}
              placeholder="Search symbol or company..."
            />
            <button
              type="button"
              onClick={doSearch}
              className="bg-brand text-white rounded-xl px-4 font-serif text-[15px] font-semibold hover:bg-brand-hover"
            >
              Go
            </button>
          </div>
        </div>

        {searching && <Loader2 className="animate-spin mt-2 text-muted" />}
        {results.map((r) => {
          const inWatchlist = watchlist.some((w) => w.symbol === r.symbol);
          return (
            <div
              key={r.symbol}
              className="flex flex-row items-center py-3 px-3 border-b border-border gap-3"
            >
              <button
                type="button"
                onClick={() => openDetail(r.symbol)}
                className="flex-1 text-left min-w-0"
              >
                <div className="font-serif text-[15px] font-semibold text-text">
                  {r.symbol}
                </div>
                <div className="font-serif text-xs text-muted mt-0.5 truncate">
                  {r.description}
                </div>
              </button>
              <button
                type="button"
                onClick={() => toggleWatchlist(r.symbol)}
                className="p-2 rounded-lg hover:bg-surface-hover"
                aria-label={
                  inWatchlist ? "Remove from watchlist" : "Add to watchlist"
                }
              >
                <Star
                  size={20}
                  color={inWatchlist ? "#f5a524" : "#8a94a6"}
                  fill={inWatchlist ? "#f5a524" : "none"}
                />
              </button>
            </div>
          );
        })}

        <div className="mt-7">
          <div className="font-serif text-lg font-bold text-text">
            Watchlist
          </div>
          {watchlist.length === 0 ? (
            <div className="font-serif text-muted italic p-4 text-center">
              No stocks in your watchlist yet.
            </div>
          ) : (
            watchlist.map((stock) => (
              <div
                key={stock.symbol}
                className="flex flex-row items-center py-3.5 px-3 bg-surface border border-border rounded-xl mt-2 gap-3"
              >
                <button
                  type="button"
                  onClick={() => openDetail(stock.symbol)}
                  className="flex-1 text-left min-w-0"
                >
                  <div className="font-serif text-base font-semibold text-text truncate">
                    {stock.symbol}
                  </div>
                  <div className="font-serif text-xs text-muted mt-0.5 truncate">
                    {stock.name}
                  </div>
                </button>
                <div className="flex flex-col items-end">
                  <div className="font-serif text-[15px] font-bold text-text">
                    ${formatMoney(stock.currentPrice)}
                  </div>
                  <div
                    className="font-serif text-xs font-semibold mt-0.5"
                    style={{ color: quoteColor(stock.percentChange) }}
                  >
                    {stock.percentChange >= 0 ? "+" : ""}
                    {stock.percentChange.toFixed(2)}%
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => toggleWatchlist(stock.symbol)}
                  className="p-2 rounded-lg hover:bg-surface-hover"
                  aria-label="Remove from watchlist"
                >
                  <Star size={16} color="#d92d20" fill="none" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {detailOpen && (
        <div className="fixed inset-0 bg-text/60 flex items-center justify-center p-6 z-50">
          <div className="w-full max-w-[380px] bg-surface border border-border rounded-2xl shadow-lg p-6">
            {loadingDetail ? (
              <Loader2 className="animate-spin text-muted" />
            ) : detailQuote ? (
              <>
                <div className="flex flex-row items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-serif text-[22px] font-bold text-text">
                      {detailQuote.symbol}
                    </div>
                    <div className="font-serif text-[13px] text-muted mt-0.5 truncate">
                      {detailQuote.name}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleWatchlist(detailQuote.symbol)}
                    className="p-1"
                  >
                    <Star
                      size={22}
                      color={
                        watchlist.some((w) => w.symbol === detailQuote.symbol)
                          ? "#f5a524"
                          : "#8a94a6"
                      }
                      fill={
                        watchlist.some((w) => w.symbol === detailQuote.symbol)
                          ? "#f5a524"
                          : "none"
                      }
                    />
                  </button>
                </div>
                <div
                  className="font-serif text-[32px] font-bold mt-4"
                  style={{ color: quoteColor(detailQuote.change) }}
                >
                  ${formatMoney(detailQuote.currentPrice)}
                </div>
                <div
                  className="font-serif text-[15px] font-semibold mt-1"
                  style={{ color: quoteColor(detailQuote.change) }}
                >
                  {detailQuote.change >= 0 ? "+" : ""}
                  {formatMoney(detailQuote.change)} (
                  {detailQuote.percentChange >= 0 ? "+" : ""}
                  {detailQuote.percentChange.toFixed(2)}%)
                </div>
                <div className="flex flex-row flex-wrap mt-5 rounded-xl overflow-hidden border border-border">
                  <div className="w-1/2 py-2.5 px-3 border-r border-b border-border bg-surface-alt">
                    <div className="font-serif text-[11px] text-muted uppercase tracking-wide">
                      Open
                    </div>
                    <div className="font-serif text-[15px] font-semibold text-text mt-1">
                      ${formatMoney(detailQuote.open)}
                    </div>
                  </div>
                  <div className="w-1/2 py-2.5 px-3 border-b border-border bg-surface-alt">
                    <div className="font-serif text-[11px] text-muted uppercase tracking-wide">
                      Prev Close
                    </div>
                    <div className="font-serif text-[15px] font-semibold text-text mt-1">
                      ${formatMoney(detailQuote.previousClose)}
                    </div>
                  </div>
                  <div className="w-1/2 py-2.5 px-3 border-r border-border bg-surface-alt">
                    <div className="font-serif text-[11px] text-muted uppercase tracking-wide">
                      High
                    </div>
                    <div className="font-serif text-[15px] font-semibold text-text mt-1">
                      ${formatMoney(detailQuote.high)}
                    </div>
                  </div>
                  <div className="w-1/2 py-2.5 px-3 bg-surface-alt">
                    <div className="font-serif text-[11px] text-muted uppercase tracking-wide">
                      Low
                    </div>
                    <div className="font-serif text-[15px] font-semibold text-text mt-1">
                      ${formatMoney(detailQuote.low)}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="font-serif text-danger">
                Could not load quote.
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                setDetailOpen(false);
                setDetailQuote(null);
              }}
              className="w-full bg-brand text-white rounded-xl py-2.5 mt-5 font-serif text-[15px] font-semibold hover:bg-brand-hover"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
