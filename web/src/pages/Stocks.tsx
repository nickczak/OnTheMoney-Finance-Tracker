import { useCallback, useEffect, useState } from "react";
import { Search, Star } from "lucide-react";

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
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Modal from "@/components/ui/Modal";
import Spinner from "@/components/ui/Spinner";
import SectionHeader from "@/components/ui/SectionHeader";
import { inputClass } from "@/components/ui/Input";

export default function Stocks() {
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

  const quoteColor = (change: number) => (change >= 0 ? "#16c784" : "#ff5c5c");
  const container = `max-w-[1100px] mx-auto px-5 pt-5 pb-8`;

  if (loading) {
    return (
      <div className="min-h-full bg-bg flex items-center justify-center p-6">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-full bg-bg flex items-center justify-center p-6">
        <div className="text-loss">{error}</div>
      </div>
    );
  }

  return (
    <>
      <div className={container}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="font-bold tracking-tight text-primary text-2xl">
              Market
            </h1>
            <p className="text-muted text-[13px] mt-0.5">
              Watch indices and your favorite tickers
            </p>
          </div>
        </div>

        {/* Indices */}
        {indices.length === 0 ? (
          <div className="text-muted-2 p-4 text-center">
            No market data available.
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            {indices.map((idx) => (
              <button
                key={idx.symbol}
                type="button"
                onClick={() => openDetail(idx.symbol)}
                className="rounded-2xl bg-surface border border-border p-4 text-left shadow-[0_8px_24px_rgba(0,0,0,0.25)] hover:border-brand/40 hover:bg-surface-2 transition-colors"
              >
                <div className="text-[10px] text-muted uppercase tracking-wider truncate">
                  {idx.name}
                </div>
                <div className="font-bold text-primary mt-1.5 tabular-nums text-[16px]">
                  ${formatMoney(idx.currentPrice)}
                </div>
                <div
                  className="text-xs font-semibold mt-1 tabular-nums"
                  style={{ color: quoteColor(idx.percentChange) }}
                >
                  {idx.percentChange >= 0 ? "▲ +" : "▼ "}
                  {idx.percentChange.toFixed(2)}%
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Search */}
        <div className="mt-8">
          <SectionHeader title="Search Stocks" />
          <div className="flex flex-row gap-2">
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-2"
              />
              <input
                className={`${inputClass} pl-10 bg-bg-2`}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && doSearch()}
                placeholder="Symbol or company name…"
              />
            </div>
            <Button variant="primary" onClick={() => doSearch()}>
              Go
            </Button>
          </div>
        </div>

        {searching && <Spinner className="mt-3" size={18} />}
        {results.length > 0 && (
          <Card className="mt-4 overflow-hidden">
            {results.map((r) => {
              const inWatchlist = watchlist.some((w) => w.symbol === r.symbol);
              return (
                <div
                  key={r.symbol}
                  className="flex flex-row items-center py-3 px-4 border-b border-border last:border-0 hover:bg-surface-2 transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => openDetail(r.symbol)}
                    className="flex-1 text-left min-w-0"
                  >
                    <div className="font-semibold text-primary">{r.symbol}</div>
                    <div className="text-xs text-muted mt-0.5 truncate">
                      {r.description}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleWatchlist(r.symbol)}
                    className="p-2 rounded-lg hover:bg-surface-3 transition-colors"
                    aria-label={
                      inWatchlist ? "Remove from watchlist" : "Add to watchlist"
                    }
                  >
                    <Star
                      size={19}
                      color={inWatchlist ? "#e6b455" : "#5c6b7a"}
                      fill={inWatchlist ? "#e6b455" : "none"}
                    />
                  </button>
                </div>
              );
            })}
          </Card>
        )}

        {/* Watchlist */}
        <div className="mt-8">
          <SectionHeader
            title="Watchlist"
            action={
              watchlist.length > 0 ? (
                <span className="text-[12px] text-muted tabular-nums">
                  {watchlist.length} saved
                </span>
              ) : undefined
            }
          />
          {watchlist.length === 0 ? (
            <div className="text-muted-2 p-4 text-center">
              No stocks in your watchlist yet.
            </div>
          ) : (
            watchlist.map((stock) => (
              <div
                key={stock.symbol}
                className="flex flex-row items-center rounded-2xl bg-surface border border-border p-3.5 mt-2 shadow-[0_8px_24px_rgba(0,0,0,0.25)] hover:border-brand/40 transition-colors"
              >
                <button
                  type="button"
                  onClick={() => openDetail(stock.symbol)}
                  className="flex-1 text-left min-w-0"
                >
                  <div className="font-semibold text-primary truncate text-[15px]">
                    {stock.symbol}
                  </div>
                  <div className="text-xs text-muted mt-0.5 truncate">
                    {stock.name}
                  </div>
                </button>
                <div className="flex flex-col items-end mr-2">
                  <div className="font-semibold text-primary tabular-nums text-[15px]">
                    ${formatMoney(stock.currentPrice)}
                  </div>
                  <div
                    className="text-xs font-medium mt-0.5 tabular-nums"
                    style={{ color: quoteColor(stock.percentChange) }}
                  >
                    {stock.percentChange >= 0 ? "▲ +" : "▼ "}
                    {stock.percentChange.toFixed(2)}%
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => toggleWatchlist(stock.symbol)}
                  className="p-2 rounded-lg hover:bg-surface-3 transition-colors"
                  aria-label="Remove from watchlist"
                >
                  <Star size={16} color="#e6b455" fill="#e6b455" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Quote detail */}
      <Modal
        open={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setDetailQuote(null);
        }}
      >
        {loadingDetail ? (
          <Spinner className="mx-auto my-6" size={24} />
        ) : detailQuote ? (
          <>
            <div className="flex flex-row items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-[22px] font-bold text-primary tracking-tight">
                  {detailQuote.symbol}
                </div>
                <div className="text-[13px] text-muted mt-0.5 truncate">
                  {detailQuote.name}
                </div>
              </div>
              <button
                type="button"
                onClick={() => toggleWatchlist(detailQuote.symbol)}
                className="p-1.5 rounded-lg hover:bg-surface-3 transition-colors"
                aria-label="Toggle watchlist"
              >
                <Star
                  size={22}
                  color={
                    watchlist.some((w) => w.symbol === detailQuote.symbol)
                      ? "#e6b455"
                      : "#5c6b7a"
                  }
                  fill={
                    watchlist.some((w) => w.symbol === detailQuote.symbol)
                      ? "#e6b455"
                      : "none"
                  }
                />
              </button>
            </div>
            <div
              className="font-bold text-[30px] mt-4 tabular-nums tracking-tight"
              style={{ color: quoteColor(detailQuote.change) }}
            >
              ${formatMoney(detailQuote.currentPrice)}
            </div>
            <div
              className="text-[14px] font-semibold mt-1 tabular-nums"
              style={{ color: quoteColor(detailQuote.change) }}
            >
              {detailQuote.change >= 0 ? "▲ +" : "▼ "}
              {formatMoney(detailQuote.change)} (
              {detailQuote.percentChange >= 0 ? "+" : ""}
              {detailQuote.percentChange.toFixed(2)}%)
            </div>
            <div className="grid grid-cols-2 gap-2 mt-5">
              {[
                ["Open", detailQuote.open],
                ["Prev Close", detailQuote.previousClose],
                ["High", detailQuote.high],
                ["Low", detailQuote.low],
              ].map(([label, value]) => (
                <div
                  key={label as string}
                  className="bg-bg-2 rounded-xl p-3 border border-border"
                >
                  <div className="text-[10px] text-muted uppercase tracking-wider">
                    {label}
                  </div>
                  <div className="font-semibold text-primary mt-1 tabular-nums">
                    ${formatMoney(value as number)}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-loss text-center py-4">
            Could not load quote.
          </div>
        )}
        <div className="flex flex-row justify-end gap-2 mt-6">
          <Button
            variant="ghost"
            onClick={() => {
              setDetailOpen(false);
              setDetailQuote(null);
            }}
          >
            Close
          </Button>
        </div>
      </Modal>
    </>
  );
}
