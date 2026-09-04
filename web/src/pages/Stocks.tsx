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

  const quoteColor = (change: number) => (change >= 0 ? "#16895f" : "#c8443d");
  const container = `bg-bg p-5 pb-20 ${isDesktop ? "max-w-[1100px] mx-auto px-8" : ""}`;

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
        <div className="font-serif text-loss">{error}</div>
      </div>
    );
  }

  return (
    <>
      <div className={container}>
        <div className="font-serif text-2xl font-bold text-primary mb-3">
          Market
        </div>
        {indices.length === 0 ? (
          <div className="font-serif text-muted-2 p-4 text-center">
            No market data available.
          </div>
        ) : (
          <div className="flex flex-row flex-wrap gap-2 mt-3">
            {indices.map((idx) => (
              <button
                key={idx.symbol}
                type="button"
                onClick={() => openDetail(idx.symbol)}
                className="bg-surface border border-border rounded-xl p-4 min-w-[120px] flex-grow text-left shadow-sm hover:border-[#009ddc]/50 hover:bg-surface-2 transition-colors"
              >
                <div className="font-serif text-[10px] text-muted uppercase tracking-wide truncate">
                  {idx.name}
                </div>
                <div className="font-serif text-base font-bold text-primary mt-1 tabular-nums">
                  ${formatMoney(idx.currentPrice)}
                </div>
                <div
                  className="font-serif text-xs font-semibold mt-0.5 tabular-nums"
                  style={{ color: quoteColor(idx.percentChange) }}
                >
                  {idx.percentChange >= 0 ? "+" : ""}
                  {idx.percentChange.toFixed(2)}%
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="mt-8">
          <div className="font-serif text-base font-bold text-primary mb-2">
            Search Stocks
          </div>
          <div className="flex flex-row gap-2">
            <input
              className="flex-1 font-serif text-[15px] text-primary bg-surface border border-border rounded-lg py-2.5 px-4 outline-none focus:border-[#009ddc]/60 placeholder:text-muted-2 transition-colors"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && doSearch()}
              placeholder="Search symbol or company..."
            />
            <button
              type="button"
              onClick={doSearch}
              className="rounded-lg bg-brand px-5 font-serif text-[14px] font-bold text-on-blue hover:bg-brand-pressed transition-colors"
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
              className="flex flex-row items-center py-3 px-3 border-b border-border gap-3 last:border-0"
            >
              <button
                type="button"
                onClick={() => openDetail(r.symbol)}
                className="flex-1 text-left min-w-0"
              >
                <div className="font-serif text-[15px] font-bold text-primary">
                  {r.symbol}
                </div>
                <div className="font-serif text-xs text-muted mt-0.5 truncate">
                  {r.description}
                </div>
              </button>
              <button
                type="button"
                onClick={() => toggleWatchlist(r.symbol)}
                className="p-2 rounded-lg hover:bg-surface-2 transition-colors"
                aria-label={
                  inWatchlist ? "Remove from watchlist" : "Add to watchlist"
                }
              >
                <Star
                  size={20}
                  color={inWatchlist ? "#c8a24b" : "#8597a0"}
                  fill={inWatchlist ? "#c8a24b" : "none"}
                />
              </button>
            </div>
          );
        })}

        <div className="mt-8">
          <div className="font-serif text-base font-bold text-primary mb-2">
            Watchlist
          </div>
          {watchlist.length === 0 ? (
            <div className="font-serif text-muted-2 p-4 text-center">
              No stocks in your watchlist yet.
            </div>
          ) : (
            watchlist.map((stock) => (
              <div
                key={stock.symbol}
                className="flex flex-row items-center bg-surface border border-border rounded-xl p-3.5 mt-2 gap-3 shadow-sm hover:border-[#009ddc]/50 transition-colors"
              >
                <button
                  type="button"
                  onClick={() => openDetail(stock.symbol)}
                  className="flex-1 text-left min-w-0"
                >
                  <div className="font-serif text-base font-bold text-primary truncate">
                    {stock.symbol}
                  </div>
                  <div className="font-serif text-xs text-muted mt-0.5 truncate">
                    {stock.name}
                  </div>
                </button>
                <div className="flex flex-col items-end">
                  <div className="font-serif text-[15px] font-bold text-primary tabular-nums">
                    ${formatMoney(stock.currentPrice)}
                  </div>
                  <div
                    className="font-serif text-xs font-semibold mt-0.5 tabular-nums"
                    style={{ color: quoteColor(stock.percentChange) }}
                  >
                    {stock.percentChange >= 0 ? "+" : ""}
                    {stock.percentChange.toFixed(2)}%
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => toggleWatchlist(stock.symbol)}
                  className="p-2 rounded-lg hover:bg-surface-2 transition-colors"
                  aria-label="Remove from watchlist"
                >
                  <Star size={16} color="#c8a24b" fill="#c8a24b" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {detailOpen && (
        <div className="fixed inset-0 bg-navy-deep/60 flex items-center justify-center p-6 z-50 backdrop-blur-sm">
          <div className="w-full max-w-[380px] bg-surface border border-border rounded-xl p-6 shadow-xl">
            {loadingDetail ? (
              <Loader2 className="animate-spin text-muted" />
            ) : detailQuote ? (
              <>
                <div className="flex flex-row items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-serif text-[22px] font-bold text-primary">
                      {detailQuote.symbol}
                    </div>
                    <div className="font-serif text-[13px] text-muted mt-0.5 truncate">
                      {detailQuote.name}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleWatchlist(detailQuote.symbol)}
                    className="p-1.5 rounded-lg hover:bg-surface-2 transition-colors"
                  >
                    <Star
                      size={22}
                      color={
                        watchlist.some((w) => w.symbol === detailQuote.symbol)
                          ? "#c8a24b"
                          : "#8597a0"
                      }
                      fill={
                        watchlist.some((w) => w.symbol === detailQuote.symbol)
                          ? "#c8a24b"
                          : "none"
                      }
                    />
                  </button>
                </div>
                <div
                  className="font-serif text-[32px] font-bold mt-4 tabular-nums"
                  style={{ color: quoteColor(detailQuote.change) }}
                >
                  ${formatMoney(detailQuote.currentPrice)}
                </div>
                <div
                  className="font-serif text-[15px] font-semibold mt-1 tabular-nums"
                  style={{ color: quoteColor(detailQuote.change) }}
                >
                  {detailQuote.change >= 0 ? "+" : ""}
                  {formatMoney(detailQuote.change)} (
                  {detailQuote.percentChange >= 0 ? "+" : ""}
                  {detailQuote.percentChange.toFixed(2)}%)
                </div>
                <div className="flex flex-row flex-wrap mt-5 gap-2">
                  {[
                    ["Open", detailQuote.open],
                    ["Prev Close", detailQuote.previousClose],
                    ["High", detailQuote.high],
                    ["Low", detailQuote.low],
                  ].map(([label, value]) => (
                    <div
                      key={label as string}
                      className="flex-1 min-w-[45%] bg-surface-2 rounded-lg p-3"
                    >
                      <div className="font-serif text-[10px] text-muted uppercase tracking-wide">
                        {label}
                      </div>
                      <div className="font-serif text-[15px] font-bold text-primary mt-1 tabular-nums">
                        ${formatMoney(value as number)}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="font-serif text-loss">Could not load quote.</div>
            )}
            <button
              type="button"
              onClick={() => {
                setDetailOpen(false);
                setDetailQuote(null);
              }}
              className="w-full rounded-lg bg-brand py-2.5 mt-5 font-serif text-[15px] font-bold text-on-blue hover:bg-brand-pressed transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
