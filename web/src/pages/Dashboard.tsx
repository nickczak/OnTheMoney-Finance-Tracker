import { useNavigate } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import {
  CreditCard,
  Landmark,
  Pencil,
  Receipt,
  TrendingUp,
  X,
} from "lucide-react";

import AccountCard from "@/components/accounts/AccountCard";
import AreaChart from "@/components/charts/AreaChart";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Modal from "@/components/ui/Modal";
import StatTile from "@/components/ui/StatTile";
import SectionHeader from "@/components/ui/SectionHeader";
import Spinner from "@/components/ui/Spinner";
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

export type RangeKey = "1W" | "1M" | "3M" | "YTD" | "1Y" | "ALL";
const RANGES: RangeKey[] = ["1W", "1M", "3M", "YTD", "1Y", "ALL"];
const PROMO_KEY = "otm-promo-dismissed";

function creditRating(score: number): { label: string; color: string } {
  if (score < 580) return { label: "Poor", color: "#ff6b5e" };
  if (score < 669) return { label: "Fair", color: "#e6b455" };
  if (score < 739) return { label: "Good", color: "#d4af6a" };
  if (score < 799) return { label: "Very Good", color: "#36e65d" };
  return { label: "Exceptional", color: "#5bf07e" };
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

/** Dollar amount with up to four decimals for small changes ($0.3143). */
function formatMoneyPrecise(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1 || abs === 0) return formatMoney(value);
  const fixed = value.toFixed(4);
  return fixed.replace(/0+$/, "").replace(/\.$/, "");
}

export default function Dashboard() {
  const router = useNavigate();
  const { scale } = useResponsiveLayout();

  const [netWorth, setNetWorth] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [inTheGreen, setInTheGreen] = useState<boolean | null>(null);
  const [inTheRed, setInTheRed] = useState<boolean | null>(null);
  const [history, setHistory] = useState<NetWorthHistoryPoint[] | null>(null);
  const [range, setRange] = useState<RangeKey>("1W");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [totalAssets, setTotalAssets] = useState<number | null>(null);
  const [totalLiabilities, setTotalLiabilities] = useState<number | null>(null);
  const [creditScore, setCreditScoreState] = useState<number | null>(null);
  const [scoreBoxOpen, setScoreBoxOpen] = useState<boolean>(false);
  const [scoreInput, setScoreInput] = useState<string>("");
  const [promoOpen, setPromoOpen] = useState<boolean>(
    () => localStorage.getItem(PROMO_KEY) !== "1",
  );

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

  const dismissPromo = useCallback(() => {
    setPromoOpen(false);
    localStorage.setItem(PROMO_KEY, "1");
  }, []);

  const saveScore = useCallback(async () => {
    const value = Number(scoreInput);
    if (!Number.isInteger(value) || value < 300 || value > 850) return;
    await setCreditScore(value);
    setCreditScoreState(value);
    setScoreBoxOpen(false);
    setScoreInput("");
  }, [scoreInput]);

  if (error) {
    return (
      <div className="min-h-full p-6">
        <div className="text-loss mt-3">Could not load Portfolio: {error}</div>
      </div>
    );
  }

  if (loading || netWorth === null) {
    return (
      <div className="min-h-full p-6 flex items-start">
        <Spinner className="mt-6" />
      </div>
    );
  }

  /* ---------------- derived data ---------------- */
  const cutoff = rangeStart(range, new Date());
  const filtered = cutoff
    ? (history ?? []).filter((h) => new Date(h.date) >= cutoff)
    : (history ?? []);
  const chartData = filtered.map((h) => h.netWorth);

  const first = filtered[0];
  const last = filtered[filtered.length - 1];
  const rangeAmount = first && last ? last.netWorth - first.netWorth : null;
  const rangePercent =
    first && first.netWorth !== 0 && rangeAmount !== null
      ? (rangeAmount / first.netWorth) * 100
      : null;
  const rangeUp = (rangeAmount ?? 0) >= 0;

  const totalAssetsFromAccounts = accounts
    .filter((a) => a.accType !== "CREDIT_CARD" && a.accType !== "LOAN")
    .reduce((sum, a) => sum + a.balance, 0);
  const banking = accounts.filter(
    (a) => a.accType === "CHECKING" || a.accType === "SAVINGS",
  );
  const investments = accounts.filter((a) => a.accType === "INVESTMENT");
  const creditCards = accounts.filter((a) => a.accType === "CREDIT_CARD");
  const loans = accounts.filter((a) => a.accType === "LOAN");
  const debt = accounts.filter(
    (a) => a.accType === "CREDIT_CARD" || a.accType === "LOAN",
  );
  const debtTotal = debt.reduce((s, a) => s + a.balance, 0);
  const assetsBucket = totalAssets ?? totalAssetsFromAccounts;
  const liabilitiesBucket = totalLiabilities ?? debtTotal;

  const accountMixRows = (
    [
      {
        key: "banking",
        label: "Banking",
        icon: Landmark,
        accounts: banking,
        isLiability: false,
      },
      {
        key: "investments",
        label: "Investments",
        icon: TrendingUp,
        accounts: investments,
        isLiability: false,
      },
      {
        key: "credit_cards",
        label: "Credit Cards",
        icon: CreditCard,
        accounts: creditCards,
        isLiability: true,
      },
      {
        key: "loans",
        label: "Loans",
        icon: Receipt,
        accounts: loans,
        isLiability: true,
      },
    ] as const
  )
    .filter((row) => row.accounts.length > 0)
    .map((row) => {
      const value = row.accounts.reduce((s, a) => s + a.balance, 0);
      const bucket = row.isLiability ? liabilitiesBucket : assetsBucket;
      return {
        ...row,
        count: row.accounts.length,
        value,
        bucketPct: bucket > 0 ? (value / bucket) * 100 : null,
      };
    });

  return (
    <div className="min-h-full">
      {/* ================= Two columns: main content + accounts ============ */}
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_330px] lg:items-start lg:gap-[18px]">
        {/* ============ LEFT COLUMN ============ */}
        <div className="min-w-0">
          {/* Net Worth */}
          <h2 className="flex flex-row items-baseline gap-3 flex-wrap mb-3">
            <span className="font-display text-[40px] leading-none tracking-[0.02em] text-primary max-[560px]:text-[32px]">
              Net Worth
            </span>
            <span className="text-[11px] uppercase tracking-[0.16em] text-muted">
              as of{" "}
              {new Date().toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
                timeZone: "UTC",
              })}
            </span>
          </h2>

          <section className="relative rounded-[3px] bg-surface engraved p-6 lg:p-7">
            <div
              className="font-serif font-bold text-primary tabular-nums tracking-tight"
              style={{ fontSize: 40 * scale }}
            >
              ${formatMoney(netWorth)}
            </div>

            <div className="flex flex-row items-center justify-between gap-4 flex-wrap mt-1.5">
              {rangeAmount !== null ? (
                <div
                  className={`font-semibold text-[14px] tabular-nums ${
                    rangeUp ? "text-gain green-glow" : "text-loss"
                  }`}
                >
                  {rangeUp ? "▲ +" : "▼ -"}
                  {formatMoneyPrecise(Math.abs(rangeAmount))}
                  {rangePercent !== null
                    ? ` (${rangeUp ? "+" : "-"}${Math.abs(rangePercent).toFixed(2)}%)`
                    : ""}
                </div>
              ) : inTheGreen ? (
                <div className="text-gain text-sm font-medium">
                  ▲ In the green
                </div>
              ) : inTheRed ? (
                <div className="text-loss text-sm font-medium">
                  ▼ In the red
                </div>
              ) : null}

              {/* Timeframe selector (kit's range tabs) */}
              <div
                className="flex flex-row items-center gap-1"
                role="tablist"
                aria-label="Chart range"
              >
                {RANGES.map((r) => (
                  <button
                    key={r}
                    type="button"
                    role="tab"
                    aria-selected={range === r}
                    onClick={() => setRange(r)}
                    className={`px-2.5 py-2 text-[12px] font-bold transition-colors ${
                      range === r
                        ? "text-brand border-b-2 border-brand"
                        : "text-primary/70 hover:text-primary"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 border-t border-dotted border-[rgba(243,240,232,0.16)] pt-4">
              {chartData.length > 1 ? (
                <AreaChart data={chartData} height={190} />
              ) : (
                <div className="text-muted-2 italic text-center py-16 border border-dashed border-[#2c2c2c] rounded-[3px]">
                  No history yet for this range.
                </div>
              )}
            </div>
          </section>

          {/* Promo banner */}
          {promoOpen && (
            <section className="relative rounded-[3px] bg-surface engraved p-4 mt-[18px] flex flex-row items-center gap-5">
              <img
                src="/assets/cash-stack.svg"
                alt=""
                className="h-[54px] w-auto object-contain shrink-0 opacity-90"
              />
              <div className="flex-1 min-w-0">
                <p className="font-serif font-semibold text-[15px] text-primary">
                  Get a 3% bonus on taxable account transfers through Sep 7.
                </p>
                <p className="text-[12px] text-muted mt-0.5">Terms apply.</p>
                <button
                  type="button"
                  onClick={() => router("/accounts")}
                  className="mt-1 text-[13px] font-bold text-brand hover:text-brand-bright transition-colors inline-flex items-center gap-1"
                >
                  Get started <span aria-hidden>→</span>
                </button>
              </div>
              <button
                type="button"
                onClick={dismissPromo}
                aria-label="Dismiss promotion"
                className="p-1.5 text-muted hover:text-primary transition-colors self-start"
              >
                <X size={16} />
              </button>
            </section>
          )}

          {/* Account Mix */}
          <div className="mt-10">
            <SectionHeader title="Account Mix" />
            <div className="flex flex-row justify-between gap-3 mb-3">
              <StatTile
                label="Total Assets"
                value={`$${formatMoney(totalAssets ?? totalAssetsFromAccounts)}`}
              />
              <StatTile
                label="Total Liabilities"
                value={`$${formatMoney(totalLiabilities ?? debtTotal)}`}
                valueClassName={
                  (totalLiabilities ?? debtTotal) > 0 ? "text-loss" : ""
                }
              />
            </div>
            <section className="relative rounded-[3px] bg-surface engraved px-3">
              {accountMixRows.length > 0 ? (
                accountMixRows.map((row) => {
                  const Icon = row.icon;
                  return (
                    <div
                      key={row.key}
                      className="w-full flex items-center gap-4 py-4 border-b border-[rgba(243,240,232,0.14)] last:border-0 text-left"
                    >
                      <span className="w-11 h-11 rounded-[2px] bg-[#0a0a0a] border border-[#2c2c2c] flex items-center justify-center shrink-0">
                        <Icon
                          size={21}
                          strokeWidth={1.6}
                          className="text-primary/80"
                        />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="font-serif font-semibold text-[16px] text-primary tracking-[0.02em]">
                          {row.label}
                        </span>
                        <span className="flex flex-wrap items-center gap-x-2 text-[12px] text-muted mt-0.5">
                          <span
                            className={`font-bold uppercase tracking-[0.08em] ${
                              row.isLiability ? "text-loss" : "text-gain"
                            }`}
                          >
                            {row.isLiability ? "Liability" : "Asset"}
                          </span>
                          {row.bucketPct !== null && (
                            <span className="tabular-nums">
                              {row.bucketPct.toFixed(2)}% of{" "}
                              {row.isLiability ? "liabilities" : "assets"}
                            </span>
                          )}
                          {row.bucketPct !== null && (
                            <span className="text-muted-2" aria-hidden>
                              ·
                            </span>
                          )}
                          <span className="tabular-nums text-muted-2">
                            {row.count} account{row.count === 1 ? "" : "s"}
                          </span>
                        </span>
                      </span>
                      <span
                        className={`font-serif font-bold tabular-nums shrink-0 ${
                          row.value !== 0 ? "text-primary" : "text-muted-2"
                        }`}
                        style={{ fontSize: 18 * scale }}
                      >
                        ${formatMoney(row.value)}
                      </span>
                    </div>
                  );
                })
              ) : (
                <p className="py-5 px-1 text-[13px] text-muted-2 italic">
                  No accounts yet. Link an account to see your mix.
                </p>
              )}
            </section>
          </div>

          <div className="h-4" />
        </div>

        {/* ============ RIGHT COLUMN ============ */}
        <div className="min-w-0 mt-10 lg:mt-[16px] space-y-4">
          {/* Debt Overview */}
          {debt.length > 0 && (
            <div>
              <SectionHeader title="Debt Overview" />
              {debt.map((account) => (
                <AccountCard key={account.id} account={account} />
              ))}
            </div>
          )}

          {/* Credit Score */}
          <div>
            <SectionHeader
              title="Credit Score"
              action={
                <button
                  type="button"
                  onClick={() => setScoreBoxOpen(true)}
                  className="p-1.5 text-muted hover:text-primary transition-colors"
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
                className="w-full rounded-[3px] bg-surface border border-dashed border-[#3a3a3a] p-6 text-muted-2 italic hover:border-brand/40 hover:text-muted transition-colors"
              >
                Tap to add your credit score.
              </button>
            ) : (
              <Card className="p-5 flex flex-row items-center justify-between gap-3">
                <div className="flex flex-row items-center gap-3">
                  <div
                    className="font-serif font-bold tabular-nums tracking-tight text-primary"
                    style={{ fontSize: 40 * scale }}
                  >
                    {creditScore}
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
                  <div className="h-1.5 w-36 bg-[#262626] overflow-hidden">
                    <div
                      className="h-full"
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
        </div>
      </div>

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
