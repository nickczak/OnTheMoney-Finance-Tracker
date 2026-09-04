import { useNavigate } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import { Pencil } from "lucide-react";

import AccountCard from "@/components/accounts/AccountCard";
import HeroHeader from "@/components/layout/HeroHeader";
import AreaChart from "@/components/charts/AreaChart";
import Sparkline from "@/components/charts/Sparkline";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Modal from "@/components/ui/Modal";
import StatTile from "@/components/ui/StatTile";
import SectionHeader from "@/components/ui/SectionHeader";
import Spinner from "@/components/ui/Spinner";
import ChangePill from "@/components/ui/ChangePill";
import { Pill, PillGroup } from "@/components/ui/Pill";
import { Input } from "@/components/ui/Input";
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
export type RangeKey = "1W" | "1M" | "3M" | "1Y" | "YTD" | "ALL";
const RANGES: RangeKey[] = ["1W", "1M", "3M", "1Y", "YTD", "ALL"];

function creditRating(score: number): { label: string; color: string } {
  if (score < 580) return { label: "Poor", color: "#ff5c5c" };
  if (score < 669) return { label: "Fair", color: "#f7b955" };
  if (score < 739) return { label: "Good", color: "#e6b455" };
  if (score < 799) return { label: "Very Good", color: "#16c784" };
  return { label: "Exceptional", color: "#10e380" };
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

function formatDateLabel(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString(
    undefined,
    { timeZone: "UTC", month: "short", day: "numeric", year: "numeric" },
  );
}

export default function Dashboard() {
  const router = useNavigate();
  const { scale, isDesktop, width } = useResponsiveLayout();
  const todayString = new Date().toLocaleDateString(undefined, {
    timeZone: "UTC",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

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
  const filtered = cutoff
    ? (history ?? []).filter((h) => new Date(h.date) >= cutoff)
    : (history ?? []);
  const list = [...filtered].reverse();
  const chartData = filtered.map((h) => h.netWorth);
  const sparkData = (history ?? []).slice(-90).map((h) => h.netWorth);

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
      <div className="min-h-full bg-bg p-6">
        <div className="text-loss mt-3 max-w-[1100px] mx-auto">
          Could not load Portfolio: {error}
        </div>
      </div>
    );
  }

  if (loading || netWorth === null) {
    return (
      <div className="min-h-full bg-bg p-6 flex items-start">
        <Spinner className="mt-6 max-w-[1100px] mx-auto" />
      </div>
    );
  }

  const column = "max-w-[1100px] mx-auto px-5";
  const heroWidth = Math.min(width, 1100) - (isDesktop ? 80 : 40);

  return (
    <div className="bg-bg min-h-full">
      {/* Hero */}
      <HeroHeader>
        <div className={`${column} pt-6 pb-8`}>
          <div className="flex items-center justify-between">
            <div className="text-[11px] uppercase tracking-[0.16em] text-[#8fb6c9] font-medium">
              Net Worth
            </div>
            <div className="text-[12px] text-[#8fb6c9] tabular-nums">
              {todayString}
            </div>
          </div>
          <div className="flex flex-row items-center gap-2.5 mt-1.5">
            <div
              className="font-bold tracking-tight text-white tabular-nums"
              style={{ fontSize: 46 * scale }}
            >
              ${formatMoney(netWorth)}
            </div>
          </div>
          <div className="mt-2.5">
            {_1y && _1y.percent !== null ? (
              <ChangePill
                amount={_1y.amount}
                percent={_1y.percent}
                up={_1y.amount >= 0}
                onDark
                suffix="past year"
              />
            ) : inTheGreen ? (
              <span className="text-gain text-sm font-medium">
                ▲ In the green
              </span>
            ) : inTheRed ? (
              <span className="text-loss text-sm font-medium">
                ▼ In the red
              </span>
            ) : null}
          </div>
          {sparkData.length > 1 && (
            <div className="mt-6">
              <Sparkline
                data={sparkData}
                width={heroWidth}
                height={56}
                id="hero"
              />
            </div>
          )}
        </div>
      </HeroHeader>

      {/* Trend tiles */}
      <div className={`${column} mt-5`}>
        <div className="flex flex-row gap-3">
          <StatTile
            label="1 Month"
            value={
              _1m ? (
                <ChangePill
                  amount={_1m.amount}
                  percent={_1m.percent}
                  up={_1m.amount >= 0}
                />
              ) : (
                "—"
              )
            }
          />
          <StatTile
            label="1 Year"
            value={
              _1y ? (
                <ChangePill
                  amount={_1y.amount}
                  percent={_1y.percent}
                  up={_1y.amount >= 0}
                />
              ) : (
                "—"
              )
            }
          />
        </div>
      </div>

      {/* Net worth history */}
      <div className={`${column} mt-8`}>
        <SectionHeader
          title="Net Worth"
          action={
            <PillGroup className="justify-end">
              {RANGES.map((r) => (
                <Pill key={r} active={range === r} onClick={() => setRange(r)}>
                  {r}
                </Pill>
              ))}
            </PillGroup>
          }
        />
        <Card className="overflow-hidden">
          {chartData.length > 1 ? (
            <div className="pt-4 px-3">
              <AreaChart data={chartData} height={180} />
            </div>
          ) : (
            <div className="text-muted-2 italic text-center p-6">
              No history yet.
            </div>
          )}
          {list.length > 0 ? (
            <div className="mt-3 max-h-[260px] overflow-auto border-t border-border">
              {list.map((point, i) => {
                const prev = i > 0 ? list[i - 1] : null;
                const change = prev ? point.netWorth - prev.netWorth : null;
                const percent =
                  change !== null && prev && prev.netWorth !== 0
                    ? (change / prev.netWorth) * 100
                    : null;
                const up = (change ?? 0) >= 0;
                return (
                  <div
                    key={point.id}
                    className="flex flex-row justify-between items-center py-3 px-4 border-b border-border/60 last:border-0"
                  >
                    <div className="text-[13px] text-muted">
                      {formatDateLabel(point.date)}
                    </div>
                    <div className="flex flex-row items-center gap-3">
                      {change !== null && (
                        <span
                          className={`text-[12px] font-medium tabular-nums ${
                            up ? "text-gain" : "text-loss"
                          }`}
                        >
                          {up ? "▲ +" : "▼ -"}${formatMoney(Math.abs(change))}
                          {percent !== null
                            ? ` (${up ? "+" : "-"}${Math.abs(percent).toFixed(1)}%)`
                            : ""}
                        </span>
                      )}
                      <span className="font-semibold text-primary tabular-nums text-[14px] w-28 text-right">
                        ${formatMoney(point.netWorth)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </Card>
      </div>

      {/* Account mix */}
      <div className={`${column} mt-8`}>
        <SectionHeader title="Account Mix" />
        {accounts.length === 0 ? (
          <div className="text-muted-2 italic text-center p-6 rounded-2xl bg-surface border border-border">
            No accounts yet.
          </div>
        ) : (
          <>
            <div className="flex flex-row justify-between gap-3">
              <StatTile
                label="Total Assets"
                value={`$${formatMoney(totalAssets ?? totalAssetsFromAccounts)}`}
              />
              <StatTile
                label="Total Liabilities"
                value={`$${formatMoney(totalLiabilities ?? 0)}`}
                valueClassName={(totalLiabilities ?? 0) > 0 ? "text-loss" : ""}
              />
            </div>
            <div className="flex flex-row flex-wrap mt-3 -mx-1">
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
          </>
        )}
      </div>

      {/* Debt */}
      {debt.length > 0 && (
        <div className={`${column} mt-8`}>
          <SectionHeader title="Debt Overview" />
          {debt.map((account) => (
            <AccountCard key={account.id} account={account} />
          ))}
        </div>
      )}

      {/* Investments */}
      {investments.length > 0 && (
        <div className={`${column} mt-6`}>
          <SectionHeader
            title="Investments"
            action={
              <Button
                variant="secondary"
                size="sm"
                onClick={() => router("/projection")}
              >
                Projections
              </Button>
            }
          />
          {investments.map((account) => (
            <AccountCard key={account.id} account={account} />
          ))}
        </div>
      )}

      {/* Credit score */}
      <div className={`${column} mt-8`}>
        <SectionHeader
          title="Credit Score"
          action={
            <button
              type="button"
              onClick={() => setScoreBoxOpen(true)}
              className="p-1.5 rounded-lg text-muted hover:text-primary hover:bg-surface-2 transition-colors"
              aria-label="Edit credit score"
            >
              <Pencil size={14} />
            </button>
          }
        />
        {creditScore === null || creditScore === 0 ? (
          <button
            type="button"
            onClick={() => setScoreBoxOpen(true)}
            className="w-full rounded-2xl bg-surface border border-dashed border-border-strong p-6 text-muted-2 italic hover:border-brand/40 hover:text-muted transition-colors"
          >
            Tap to add your credit score.
          </button>
        ) : (
          <Card className="p-5 flex flex-row items-center justify-between gap-3">
            <div className="flex flex-row items-center gap-3">
              <div
                className="font-bold tabular-nums tracking-tight text-primary"
                style={{ fontSize: 40 * scale }}
              >
                {creditScore}
              </div>
              <div className="text-[11px] uppercase tracking-[0.12em] text-muted leading-tight">
                out of
                <br />
                850
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span
                className="font-semibold"
                style={{
                  color: creditRating(creditScore).color,
                  fontSize: 18 * scale,
                }}
              >
                {creditRating(creditScore).label}
              </span>
              <div className="h-1.5 w-36 rounded-full bg-surface-3 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(100, (creditScore / 850) * 100)}%`,
                    backgroundColor: creditRating(creditScore).color,
                  }}
                />
              </div>
            </div>
          </Card>
        )}
      </div>

      <div className="h-4" />

      {/* Credit score dialog */}
      <Modal
        open={scoreBoxOpen}
        onClose={() => setScoreBoxOpen(false)}
        title="Credit Score"
      >
        <p className="text-[13px] text-muted mb-5">
          Scores range from 300 to 850.
        </p>
        <Input
          value={scoreInput}
          onChange={(e) => setScoreInput(e.target.value)}
          type="number"
          placeholder="300–850"
          autoFocus
        />
        <div className="flex flex-row justify-end gap-2 mt-6">
          <Button variant="ghost" onClick={() => setScoreBoxOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => void saveScore()}>Save</Button>
        </div>
      </Modal>
    </div>
  );
}
