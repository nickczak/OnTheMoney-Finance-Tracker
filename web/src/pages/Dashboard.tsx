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
const RANGES: RangeKey[] = ["1W", "1M", "3M", "1Y", "YTD", "ALL"];

function creditRating(score: number): { label: string; color: string } {
  if (score < 580) return { label: "Poor", color: "#ff3b30" };
  if (score < 669) return { label: "Fair", color: "#ff9500" };
  if (score < 739) return { label: "Good", color: "#ffcc00" };
  if (score < 799) return { label: "Very Good", color: "#34c759" };
  return { label: "Exceptional", color: "#0a7a2d" };
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
    <div className="flex-1 border border-white p-3.5">
      <div className="font-serif text-[13px] uppercase tracking-widest text-[#98989d]">
        {label}
      </div>
      <div
        className={`font-serif font-bold mt-1.5 ${up ? "text-brand" : "text-danger"}`}
        style={{ fontSize: 17 * scale }}
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
    case "3M":
      return new Date(utcNow - 89 * 86400000);
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
        className={`bg-black p-4 min-h-full ${isDesktop ? "max-w-[1100px] mx-auto px-6" : ""}`}
      >
        <div className="font-serif text-danger mt-3">
          Could not load Portfolio: {error}
        </div>
      </div>
    );
  }

  if (loading || netWorth === null) {
    return (
      <div
        className={`bg-black p-4 min-h-full ${isDesktop ? "max-w-[1100px] mx-auto px-6" : ""}`}
      >
        <Loader2 className="animate-spin mt-6 text-[#98989d]" />
      </div>
    );
  }

  const container = `bg-black p-4 pb-20 ${isDesktop ? "max-w-[1100px] mx-auto px-6" : ""}`;

  return (
    <div className={container}>
      {/* header + as-of */}
      <div className="flex flex-row items-end -mt-4">
        <div
          className="font-serif font-bold text-white flex-shrink truncate"
          style={{ fontSize: 34 * scale }}
        >
          Net Worth
        </div>
        <div
          className="font-serif text-[#98989d] mb-1 ml-1 flex-shrink truncate"
          style={{ fontSize: 15 * scale }}
        >
          {" as of " + todayString}
        </div>
      </div>

      {/* value + arrow */}
      <div className="flex flex-row items-center gap-2">
        <div
          className="font-serif font-bold text-white mt-0.5 flex-shrink truncate"
          style={{ fontSize: 64 * scale }}
        >
          ${formatMoney(netWorth)}
        </div>
        {inTheGreen ? (
          <div className="text-brand text-xs mb-6 -ml-1.5">▲</div>
        ) : inTheRed ? (
          <div className="text-danger text-xs mb-6 -ml-1.5">▼</div>
        ) : null}
      </div>

      {/* trend stats row */}
      <div className="flex flex-row justify-between gap-3 mt-6">
        <TrendStat label="1M" change={_1m} />
        <TrendStat label="1Y" change={_1y} />
      </div>

      {/* History */}
      <div className="flex flex-row items-center justify-between mt-7">
        <div className="font-serif text-lg font-bold text-white">History</div>
        <div className="flex flex-row flex-1 flex-shrink justify-between">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={`px-2 py-1 font-serif text-xs ${
                range === r
                  ? "bg-[#1c1c1e] text-white font-bold"
                  : "text-[#98989d]"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-2 border border-[#2c2c2e] overflow-hidden max-h-[435px]">
        {preview.length === 0 ? (
          <div className="font-serif text-[#98989d] italic p-6 text-center">
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
                className="flex flex-row justify-between items-center py-3 px-4 border-b border-[#2c2c2e] bg-black"
              >
                <div className="flex flex-col flex-shrink min-w-0">
                  <div
                    className="font-serif text-[#d0d0d0] truncate"
                    style={{ fontSize: 15 * scale }}
                  >
                    {formatDate(point.date)}
                  </div>
                  {change !== null && (
                    <div
                      className="font-serif mt-0.5 truncate"
                      style={{
                        fontSize: 12 * scale,
                        color: up ? "#00ff88" : "#ff6b6b",
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
                        color: up ? "#00ff88" : "#ff6b6b",
                      }}
                    >
                      {up ? "▲" : "▼"}
                    </div>
                  )}
                  <div
                    className="font-serif font-bold text-white flex-shrink truncate"
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

      {/* Account mix */}
      <div className="mt-7">
        <div className="font-serif text-lg font-bold text-white mb-2.5">
          Account Mix
        </div>
        <div className="flex flex-row justify-between gap-3 mb-2">
          <div className="flex-1 border border-white p-3.5">
            <div className="font-serif text-[13px] uppercase tracking-widest text-[#98989d]">
              Total Assets
            </div>
            <div className="font-serif text-white">
              {formatMoney(totalAssets ?? totalAssetsFromAccounts)}
            </div>
          </div>
          <div className="flex-1 border border-white p-3.5">
            <div className="font-serif text-[13px] uppercase tracking-widest text-[#98989d]">
              Total Liabilities
            </div>
            <div className="font-serif text-white">
              {formatMoney(totalLiabilities ?? 0)}
            </div>
          </div>
        </div>
        {accounts.length === 0 ? (
          <div className="font-serif text-[#98989d] italic p-6 text-center">
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
      <div className="mt-3">
        <div className="font-serif text-lg font-bold text-white mb-2.5 mt-3">
          Debt Overview
        </div>
        {accounts.length === 0 || debt.length === 0 ? (
          <div className="font-serif text-[#98989d] italic p-6 text-center">
            No outstanding debt.
          </div>
        ) : (
          debt.map((account) => (
            <AccountCard key={account.id} account={account} />
          ))
        )}
      </div>

      {/* Investments */}
      <div>
        <div className="flex flex-row items-center justify-between mt-3">
          <div className="font-serif text-lg font-bold text-white mb-2.5">
            Investments
          </div>
          <button
            type="button"
            onClick={() => router("/projection")}
            className="border border-white px-3.5 py-1.5 font-serif text-[13px] tracking-wider text-white"
          >
            Projections
          </button>
        </div>
        {accounts.length === 0 || investments.length === 0 ? (
          <div className="font-serif text-[#98989d] italic p-6 text-center">
            No Investment accounts.
          </div>
        ) : (
          investments.map((account) => (
            <AccountCard key={account.id} account={account} />
          ))
        )}
      </div>

      {/* Credit score */}
      <div className="mt-3">
        <div className="flex flex-row items-center gap-3">
          <div className="font-serif text-lg font-bold text-white mb-2.5">
            Credit Score
          </div>
          <button
            type="button"
            onClick={() => setScoreBoxOpen(true)}
            className="mb-2.5"
          >
            <Pencil size={14} color="#98989d" />
          </button>
        </div>
        {creditScore === null || creditScore === 0 ? (
          <button
            type="button"
            onClick={() => setScoreBoxOpen(true)}
            className="w-full text-left"
          >
            <div className="font-serif text-[#98989d] italic p-6 text-center">
              Tap to add credit score.
            </div>
          </button>
        ) : (
          <div className="bg-black border border-white p-3.5 my-1.5">
            <div className="flex flex-row items-center justify-between gap-2">
              <div
                className="font-serif font-bold text-white"
                style={{ fontSize: 40 * scale }}
              >
                {creditScore}
              </div>
              <div className="flex flex-row items-center gap-2">
                <div
                  className="w-2.5 h-2.5 rounded-full mr-1.5"
                  style={{ backgroundColor: creditRating(creditScore).color }}
                />
                <div
                  className="font-serif font-semibold"
                  style={{
                    fontSize: 22 * scale,
                    color: creditRating(creditScore).color,
                  }}
                >
                  {creditRating(creditScore).label}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Credit score dialog */}
      {scoreBoxOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-6 z-50">
          <div className="w-full max-w-[420px] bg-black border border-white p-6">
            <div className="font-serif text-xl font-bold text-white mb-4">
              Credit Score
            </div>
            <input
              className="font-serif text-lg text-white bg-black py-2.5 px-3.5 mb-5 outline-none border-b border-[#3a3a3c] max-w-[260px]"
              value={scoreInput}
              onChange={(e) => setScoreInput(e.target.value)}
              type="number"
              maxLength={3}
              placeholder="300-850"
              autoFocus
            />
            <div className="flex flex-row justify-center gap-6">
              <button
                type="button"
                onClick={() => setScoreBoxOpen(false)}
                className="py-2.5 px-4 font-serif text-base text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => saveScore()}
                className="py-2.5 px-4 font-serif text-base text-white"
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
