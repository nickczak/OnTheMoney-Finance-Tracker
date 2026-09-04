import { useNavigate } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import { Loader2, Pencil } from "lucide-react";

import AccountCard from "@/components/AccountCard";
import { useResponsiveLayout } from "@/lib/responsive";
import {
  fetchNetWorth,
  fetchInTheGreen,
  fetchInTheRed,
  fetchNetWorthHistory,
  fetchTotalAssets,
  fetchTotalLiabilities,
  recordNetWorthSnapshot,
  fetchAccounts,
  fetchCreditScore,
  setCreditScore,
} from "@/lib/api";
import { formatMoney } from "@/lib/format";
import type { NetWorthHistoryPoint } from "@/types/NetWorth";
import type { Account } from "@/types/Account";

type Trend = { amount: number; percent: number | null } | null;
export type RangeKey = "1W" | "1M" | "3M" | "YTD" | "1Y" | "ALL";
const RANGES: RangeKey[] = ["1W", "1M", "1Y", "YTD", "ALL"];

function creditRating(score: number): { label: string; color: string } {
  if (score < 580) return { label: "Poor", color: "#c8443d" };
  if (score < 669) return { label: "Fair", color: "#c8862b" };
  if (score < 739) return { label: "Good", color: "#c8a24b" };
  if (score < 799) return { label: "Very Good", color: "#16895f" };
  return { label: "Exceptional", color: "#0f7a52" };
}

function changeOver(history: NetWorthHistoryPoint[], days: number): Trend {
  const cutoff = Date.now() - days * 86400000;
  const reverse = [...history].reverse();
  const prior = reverse.find((h) => new Date(h.date).getTime() <= cutoff);
  const latest = history[history.length - 1];
  if (!prior || !latest) return null;
  const amount = latest.netWorth - prior.netWorth;
  const percent = prior.netWorth === 0 ? null : (amount / prior.netWorth) * 100;
  return { amount, percent };
}

function TrendStat({ label, change }: { label: string; change: Trend }) {
  const { scale } = useResponsiveLayout();
  if (!change) return null;
  const up = change.amount >= 0;
  return (
    <div className="flex-1 bg-surface border border-border rounded-xl p-4 shadow-sm">
      <div className="font-serif text-[11px] uppercase tracking-widest text-muted">
        {label}
      </div>
      <div
        className={`font-serif font-bold mt-1.5 tabular-nums ${
          up ? "text-gain" : "text-loss"
        }`}
        style={{ fontSize: 18 * scale }}
      >
        {up ? "▲" : "▼"} ${formatMoney(change.amount)}
        {change.percent !== null
          ? ` (${change.percent >= 0 ? "+" : ""}${change.percent.toFixed(1)}%)`
          : ""}
      </div>
    </div>
  );
}

function rangeStart(range: RangeKey, now: Date): Date | null {
  const utcNow = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  switch (range) {
    case "1W":
      return new Date(utcNow - 6 * 86400000);
    case "1M":
      return new Date(utcNow - 29 * 86400000);
    case "1Y":
      return new Date(utcNow - 364 * 86400000);
    case "YTD":
      return new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    case "ALL":
      return null;
    default:
      throw new Error(`Unknown range: ${range}`);
  }
}

export default function Dashboard() {
  const router = useNavigate();
  const { scale, isDesktop } = useResponsiveLayout();
  const todayString = new Date().toLocaleDateString(undefined, {
    timeZone: "UTC",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const formatDate = (date: string) => {
    const [year, month, day] = date.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString(
      undefined,
      {
        timeZone: "UTC",
        month: "short",
        day: "numeric",
        year: "numeric",
      },
    );
  };

  const [netWorth, setNetWorth] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [inTheGreen, setInTheGreen] = useState<boolean | null>(null);
  const [inTheRed, setInTheRed] = useState<boolean | null>(null);
  const [history, setHistory] = useState<NetWorthHistoryPoint[] | null>(null);
  const [range, setRange] = useState<RangeKey>("ALL");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [totalAssets, setTotalAssets] = useState<number | null>(null);
  const [totalLiabilities, setTotalLiabilities] = useState<number | null>(null);
  const [creditScore, setCreditScoreState] = useState<number | null>(null);
  const [scoreBoxOpen, setScoreBoxOpen] = useState<boolean>(false);
  const [scoreInput, setScoreInput] = useState<string>("");

  const loadData = useCallback(async () => {
    try {
      await recordNetWorthSnapshot();
    } catch {
      // ignore
    }
    Promise.all([
      fetchNetWorth()
        .then(setNetWorth)
        .catch((err: unknown) =>
          setError(
            err instanceof Error ? err.message : "Failed to load net worth",
          ),
        )
        .finally(() => setLoading(false)),
      fetchNetWorthHistory()
        .then(setHistory)
        .catch((err: unknown) =>
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load net worth history",
          ),
        ),
    ]);
    fetchInTheGreen()
      .then(setInTheGreen)
      .catch(() => {});
    fetchInTheRed()
      .then(setInTheRed)
      .catch(() => {});
    fetchAccounts()
      .then(setAccounts)
      .catch(() => {});
    fetchTotalAssets()
      .then(setTotalAssets)
      .catch(() => {});
    fetchTotalLiabilities()
      .then(setTotalLiabilities)
      .catch(() => {});
    fetchCreditScore()
      .then(setCreditScoreState)
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const saveScore = useCallback(async () => {
    const value = Number(scoreInput);
    if (!Number.isInteger(value) || value < 300 || value > 850) return;
    await setCreditScore(value);
    setCreditScoreState(value);
    setScoreBoxOpen(false);
    setScoreInput("");
  }, [scoreInput]);

  const cutoff = rangeStart(range, new Date());
  const filteredQuotes = cutoff
    ? (history ?? []).filter((h) => new Date(h.date) >= cutoff)
    : (history ?? []);
  const preview = [...filteredQuotes].reverse();
  const _1m = changeOver(history ?? [], 30);
  const _1y = changeOver(history ?? [], 365);
  const totalAssetsFromAccounts = accounts
    .filter((a) => a.accType !== "CREDIT_CARD" && a.accType !== "LOAN")
    .reduce((sum, a) => sum + a.balance, 0);
  const debt = accounts.filter(
    (a) => a.accType === "CREDIT_CARD" || a.accType === "LOAN",
  );
  const investments = accounts.filter((a) => a.accType === "INVESTMENT");

  if (error) {
    return (
      <div
        className={`bg-bg p-5 min-h-full ${isDesktop ? "max-w-[1100px] mx-auto px-8" : ""}`}
      >
        <div className="font-serif text-loss mt-3">
          Could not load Portfolio: {error}
        </div>
      </div>
    );
  }

  if (loading || netWorth === null) {
    return (
      <div
        className={`bg-bg p-5 min-h-full ${isDesktop ? "max-w-[1100px] mx-auto px-8" : ""}`}
      >
        <Loader2 className="animate-spin mt-6 text-muted" />
      </div>
    );
  }

  const container = `bg-bg min-h-full pb-20 ${isDesktop ? "max-w-[1100px] mx-auto" : ""}`;
  const heroBody = `${isDesktop ? "" : "px-5"} pt-4 pb-8 bg-gradient-to-br from-navy to-navy-deep`;
  const inner = isDesktop ? "px-8" : "px-5";

  const sectionTitle = "font-serif text-base font-bold text-primary";

  return (
    <div className={container}>
      {/* Navy hero header */}
      <div className={heroBody}>
        <div
          className={`${isDesktop ? "px-8" : ""} flex items-center justify-between`}
        >
          <div
            className="font-serif font-bold text-white"
            style={{ fontSize: 22 * scale }}
          >
            Portfolio
          </div>
          <div
            className="font-serif text-[#9dc4d8] text-[11px] uppercase tracking-widest"
            style={{ fontSize: 11 * scale }}
          >
            {todayString}
          </div>
        </div>
        <div className={`${isDesktop ? "px-8" : ""} mt-6`}>
          <div className="font-serif text-[#9dc4d8] text-[11px] uppercase tracking-[0.6px]">
            Net Worth
          </div>
          <div className="flex flex-row items-center gap-2">
            <div
              className="font-serif font-extrabold text-white mt-1 tabular-nums"
              style={{ fontSize: 44 * scale }}
            >
              ${formatMoney(netWorth)}
            </div>
            {inTheGreen ? (
              <span className="text-[#5fe3b0] text-sm mt-2">▲</span>
            ) : inTheRed ? (
              <span className="text-[#e2564e] text-sm mt-2">▼</span>
            ) : null}
          </div>
          {_1y && _1y.percent !== null ? (
            <div className="flex flex-row items-center gap-1 mt-1.5">
              <span
                className="font-serif text-sm tabular-nums"
                style={{ color: _1y.percent >= 0 ? "#5fe3b0" : "#e2564e" }}
              >
                {_1y.percent >= 0 ? "▲" : "▼"} $
                {formatMoney(Math.abs(_1y.amount))} (
                {_1y.percent >= 0 ? "+" : "-"}
                {Math.abs(_1y.percent).toFixed(1)}%)
              </span>
              <span className="font-serif text-[#9dc4d8] text-sm">
                past year
              </span>
            </div>
          ) : null}
        </div>
      </div>

      {/* Trend stats row */}
      <div className={`${inner} mt-5`}>
        <div className="flex flex-row justify-between gap-3">
          <TrendStat label="1 Month" change={_1m} />
          <TrendStat label="1 Year" change={_1y} />
        </div>
      </div>

      {/* History */}
      <div className={`${inner} mt-8`}>
        <div className="flex flex-row items-center justify-between">
          <div className={sectionTitle}>History</div>
          <div className="flex flex-row flex-1 flex-shrink justify-end gap-1">
            {RANGES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={`px-2.5 py-1 font-serif text-xs rounded-lg transition-colors ${
                  range === r
                    ? "bg-[#eaf2f6] text-info font-bold border border-[#b5d7e6]"
                    : "text-muted border border-transparent hover:text-primary"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 bg-surface border border-border rounded-xl overflow-hidden max-h-[435px] shadow-sm">
          {preview.length === 0 ? (
            <div className="font-serif text-muted-2 italic p-6 text-center">
              No history yet.
            </div>
          ) : (
            preview.map((point, i) => {
              const prev = i > 0 ? preview[i - 1] : null;
              const change = prev ? point.netWorth - prev.netWorth : null;
              const percent =
                change !== null && prev && prev.netWorth !== 0
                  ? (change / prev.netWorth) * 100
                  : null;
              const up = (change ?? 0) >= 0;
              return (
                <div
                  key={point.id}
                  className="flex flex-row justify-between items-center py-3 px-4 border-b border-border last:border-0"
                >
                  <div className="flex flex-col flex-shrink min-w-0">
                    <div
                      className="font-serif text-muted"
                      style={{ fontSize: 15 * scale }}
                    >
                      {formatDate(point.date)}
                    </div>
                    {change !== null && (
                      <div
                        className="font-serif mt-0.5 tabular-nums"
                        style={{
                          fontSize: 12 * scale,
                          color: up ? "#16895f" : "#c8443d",
                        }}
                      >
                        {up ? "+" : "-"}${formatMoney(Math.abs(change))}
                        {percent !== null
                          ? ` (${up ? "+" : "-"}${Math.abs(percent).toFixed(2)}%)`
                          : ""}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-row items-center">
                    {change !== null && (
                      <div
                        className="font-serif mr-1.5"
                        style={{
                          fontSize: 12 * scale,
                          color: up ? "#16895f" : "#c8443d",
                        }}
                      >
                        {up ? "▲" : "▼"}
                      </div>
                    )}
                    <div
                      className="font-serif font-bold text-primary flex-shrink truncate tabular-nums"
                      style={{ fontSize: 15 * scale }}
                    >
                      ${formatMoney(point.netWorth)}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Account mix */}
      <div className={`${inner} mt-8`}>
        <div className={`${sectionTitle} mb-3`}>Account Mix</div>
        <div className="flex flex-row justify-between gap-3 mb-2">
          <div className="flex-1 bg-surface border border-border rounded-xl p-4 shadow-sm">
            <div className="font-serif text-[11px] uppercase tracking-widest text-muted">
              Total Assets
            </div>
            <div className="font-serif text-primary text-lg mt-1 tabular-nums">
              {formatMoney(totalAssets ?? totalAssetsFromAccounts)}
            </div>
          </div>
          <div className="flex-1 bg-surface border border-border rounded-xl p-4 shadow-sm">
            <div className="font-serif text-[11px] uppercase tracking-widest text-muted">
              Total Liabilities
            </div>
            <div
              className={`font-serif text-lg mt-1 tabular-nums ${
                (totalLiabilities ?? 0) > 0 ? "text-loss" : "text-primary"
              }`}
            >
              {formatMoney(totalLiabilities ?? 0)}
            </div>
          </div>
        </div>
        {accounts.length === 0 ? (
          <div className="font-serif text-muted-2 italic p-6 text-center">
            No accounts yet.
          </div>
        ) : (
          <div className="flex flex-row flex-wrap justify-start">
            {accounts.map((account) => (
              <AccountCard
                key={account.id}
                account={account}
                percent={
                  totalAssetsFromAccounts > 0
                    ? account.balance / totalAssetsFromAccounts
                    : 0
                }
              />
            ))}
          </div>
        )}
      </div>

      {/* Debt overview */}
      <div className={`${inner} mt-8`}>
        <div className={`${sectionTitle} mb-1`}>Debt Overview</div>
        {accounts.length === 0 || debt.length === 0 ? (
          <div className="font-serif text-muted-2 italic p-6 text-center">
            No outstanding debt.
          </div>
        ) : (
          debt.map((account) => (
            <AccountCard key={account.id} account={account} />
          ))
        )}
      </div>

      {/* Investments */}
      <div className={`${inner} mt-6`}>
        <div className="flex flex-row items-center justify-between mb-1">
          <div className={sectionTitle}>Investments</div>
          <button
            type="button"
            onClick={() => router("/projection")}
            className="rounded-lg border border-[#0078a8] px-4 py-2 font-serif text-[12px] tracking-wider text-[#0078a8] hover:bg-[#eaf2f6] transition-colors"
          >
            Projections
          </button>
        </div>
        {accounts.length === 0 || investments.length === 0 ? (
          <div className="font-serif text-muted-2 italic p-6 text-center">
            No Investment accounts.
          </div>
        ) : (
          investments.map((account) => (
            <AccountCard key={account.id} account={account} />
          ))
        )}
      </div>

      {/* Credit score */}
      <div className={`${inner} mt-8`}>
        <div className="flex flex-row items-center gap-3">
          <div className={sectionTitle}>Credit Score</div>
          <button
            type="button"
            onClick={() => setScoreBoxOpen(true)}
            className="mb-1"
          >
            <Pencil size={14} color="#8597a0" />
          </button>
        </div>
        {creditScore === null || creditScore === 0 ? (
          <button
            type="button"
            onClick={() => setScoreBoxOpen(true)}
            className="w-full text-left bg-surface border border-dashed border-border-strong rounded-xl p-6 hover:border-[#009ddc]/50 transition-colors"
          >
            <div className="font-serif text-muted-2 italic text-center">
              Tap to add credit score.
            </div>
          </button>
        ) : (
          <div className="bg-surface border border-border rounded-xl p-5 my-1.5 flex flex-row items-center justify-between gap-3 shadow-sm">
            <div className="flex flex-row items-center gap-3">
              <div
                className="font-serif font-bold text-primary tabular-nums"
                style={{ fontSize: 40 * scale }}
              >
                {creditScore}
              </div>
              <div className="font-serif text-[12px] uppercase tracking-widest text-muted">
                out of
                <br />
                850
              </div>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <div className="flex flex-row items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: creditRating(creditScore).color }}
                />
                <span
                  className="font-serif font-semibold"
                  style={{
                    fontSize: 20 * scale,
                    color: creditRating(creditScore).color,
                  }}
                >
                  {creditRating(creditScore).label}
                </span>
              </div>
              <div className="h-1.5 w-40 rounded-full bg-surface-2 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(100, (creditScore / 850) * 100)}%`,
                    backgroundColor: creditRating(creditScore).color,
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Credit score dialog */}
      {scoreBoxOpen && (
        <div className="fixed inset-0 bg-navy-deep/60 flex items-center justify-center p-6 z-50 backdrop-blur-sm">
          <div className="w-full max-w-[360px] bg-surface border border-border rounded-xl p-6 shadow-xl">
            <div className="font-serif text-xl font-bold text-primary mb-1">
              Credit Score
            </div>
            <div className="font-serif text-[13px] text-muted mb-5">
              Scores range from 300 to 850.
            </div>
            <input
              className="font-serif text-lg text-primary bg-surface-2 rounded-lg py-3 px-4 mb-6 outline-none border border-border focus:border-[#009ddc]/60 w-full tabular-nums placeholder:text-muted-2"
              value={scoreInput}
              onChange={(e) => setScoreInput(e.target.value)}
              type="number"
              maxLength={3}
              placeholder="300-850"
              autoFocus
            />
            <div className="flex flex-row justify-end gap-3">
              <button
                type="button"
                onClick={() => setScoreBoxOpen(false)}
                className="px-4 py-2.5 rounded-lg font-serif text-sm text-muted hover:bg-surface-2 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => saveScore()}
                className="px-5 py-2.5 rounded-lg bg-brand font-serif text-sm font-bold text-on-blue hover:bg-brand-pressed transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
