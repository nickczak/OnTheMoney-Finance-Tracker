import { useCallback, useEffect, useState } from "react";

import { useResponsiveLayout } from "@/lib/responsive";
import { fetchTotalAssets, projectRetirement } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import type { Projection } from "@/types/Projection";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Spinner from "@/components/ui/Spinner";
import { Field, Input } from "@/components/ui/Input";

const SERIES = [
  { key: "worst10Trajectory", color: "#ff5c5c", label: "Worst 10%" },
  { key: "medianTrajectory", color: "#f7b955", label: "Median" },
  { key: "meanTrajectory", color: "#55b8f5", label: "Mean" },
  { key: "best10Trajectory", color: "#16c784", label: "Best 10%" },
] as const;

function ProjLineChart({ result }: { result: Projection }) {
  const { scale } = useResponsiveLayout();
  const width = 340 * scale;
  const height = 200;
  const pad = 8;

  const series = SERIES.map((s) => ({
    ...s,
    data: result[s.key],
  }));

  const allValues = series.flatMap((s) => s.data);
  const maxVal = Math.max(...allValues);
  const minVal = Math.min(...allValues, 0);
  const n = Math.max(series[0].data.length, 1);

  const point = (i: number, v: number) => {
    const x = (i / (n - 1)) * width;
    const y =
      height -
      pad -
      ((v - minVal) / (maxVal - minVal || 1)) * (height - pad * 2);
    return `${x},${y}`;
  };

  return (
    <div>
      <div className="rounded-[3px] bg-bg-2 border border-[rgba(243,240,232,0.14)] p-2 shadow-[inset_0_0_24px_rgba(0,0,0,0.4)]">
        <svg width={width} height={height}>
          {[0, 0.25, 0.5, 0.75, 1].map((g) => {
            const y = height - pad - g * (height - pad * 2);
            return (
              <line
                key={g}
                x1={0}
                y1={y}
                x2={width}
                y2={y}
                stroke="rgba(243,240,232,0.1)"
                strokeWidth={1}
              />
            );
          })}
          {series.map((s) => (
            <polyline
              key={s.label}
              points={s.data.map((v, i) => point(i, v)).join(" ")}
              fill="none"
              stroke={s.color}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}
        </svg>
      </div>
      <div className="flex flex-row flex-wrap justify-center gap-x-4 gap-y-1 mt-2">
        {series.map((s) => (
          <span
            key={s.label}
            className="flex items-center gap-1.5 text-[12px] text-muted"
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: s.color }}
            />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function Projection() {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [result, setResult] = useState<Projection | null>(null);
  const [initial, setInitial] = useState<string>("10000");
  const [contribution, setContribution] = useState<string>("500");
  const [rate, setRate] = useState<string>("7");
  const [years, setYears] = useState<string>("30");
  const [sims, setSims] = useState<string>("10000");

  useEffect(() => {
    fetchTotalAssets()
      .then((t) => {
        if (t > 0) setInitial(String(t));
      })
      .catch(() => {});
  }, []);

  const run = useCallback(async () => {
    const initialBalance = Number(initial);
    const monthlyContribution = Number(contribution);
    const returnRate = Number(rate);
    const yearsNum = Number(years);
    const simulations = Number(sims);
    if (
      !Number.isFinite(initialBalance) ||
      !Number.isFinite(monthlyContribution) ||
      !Number.isFinite(returnRate) ||
      !Number.isInteger(yearsNum) ||
      yearsNum <= 0 ||
      !Number.isInteger(simulations) ||
      simulations <= 0 ||
      simulations > 100000
    ) {
      setFormError(
        "Check your inputs: years & simulations must be whole numbers, and simulations ≤ 100000.",
      );
      return;
    }
    setFormError(null);
    setLoading(true);
    setError(null);
    try {
      const proj = await projectRetirement({
        initialBalance,
        monthlyContribution,
        returnRate,
        years: yearsNum,
        simulations,
      });
      setResult(proj);
    } catch (err) {
      setError(
        `Projection failed (${err instanceof Error ? err.message : "unknown error"}). ` +
          "The C++ engine must be built and running.",
      );
    } finally {
      setLoading(false);
    }
  }, [initial, contribution, rate, years, sims]);

  const resultValues: {
    label: string;
    value: number;
    className: string;
  }[] = result
    ? [
        { label: "Worst 10%", value: result.worst10, className: "text-loss" },
        { label: "Median", value: result.median, className: "text-warning" },
        { label: "Mean", value: result.mean, className: "text-info" },
        { label: "Best 10%", value: result.best10, className: "text-gain" },
      ]
    : [];

  return (
    <div className="min-h-full">
      <div className="pt-5 pb-8">
        <div>
          <div className="font-display text-[32px] leading-none tracking-[0.02em] text-primary">
            Retirement Projection
          </div>
          <p className="text-muted mt-1.5 mb-5 text-[14px]">
            Runs thousands of random market simulations to project your
            retirement savings.
          </p>
        </div>

        {error ? <div className="text-loss mt-4 text-sm">{error}</div> : null}

        <Card className="p-5">
          {result ? (
            <div className="mb-6">
              <div className="font-display text-primary mb-3 text-[22px] leading-none tracking-[0.02em]">
                Projected balance after {result.years} years
              </div>
              <ProjLineChart result={result} />
              <div className="grid grid-cols-2 gap-2.5 mt-4">
                {resultValues.map((r) => (
                  <div
                    key={r.label}
                    className="rounded-[3px] bg-bg-2 border border-[rgba(243,240,232,0.14)] p-3 shadow-[inset_0_0_18px_rgba(0,0,0,0.35)]"
                  >
                    <div className="text-[10px] uppercase tracking-[0.12em] text-muted font-medium">
                      {r.label}
                    </div>
                    <div
                      className={`font-semibold mt-1 tabular-nums ${r.className}`}
                    >
                      ${formatMoney(r.value)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
            <Field label="Initial balance" htmlFor="pInitial">
              <Input
                id="pInitial"
                type="number"
                value={initial}
                onChange={(e) => setInitial(e.target.value)}
                placeholder="10,000"
              />
            </Field>
            <Field label="Monthly contribution" htmlFor="pContrib">
              <Input
                id="pContrib"
                type="number"
                value={contribution}
                onChange={(e) => setContribution(e.target.value)}
                placeholder="500"
              />
            </Field>
            <Field label="Return rate (%)" htmlFor="pRate">
              <Input
                id="pRate"
                type="number"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                placeholder="7"
              />
            </Field>
            <Field label="Years" htmlFor="pYears">
              <Input
                id="pYears"
                type="number"
                value={years}
                onChange={(e) => setYears(e.target.value)}
                placeholder="30"
              />
            </Field>
            <Field label="Simulations" htmlFor="pSims" hint="Maximum 100,000">
              <Input
                id="pSims"
                type="number"
                value={sims}
                onChange={(e) => setSims(e.target.value)}
                placeholder="10,000"
              />
            </Field>
          </div>

          {formError ? (
            <div className="text-loss text-[13px] text-center mt-2 mb-1">
              {formError}
            </div>
          ) : null}

          <Button
            size="lg"
            className="w-full mt-5"
            onClick={() => void run()}
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Spinner size={16} className="text-on-brand" /> Running…
              </span>
            ) : (
              "Run Projection"
            )}
          </Button>
        </Card>
      </div>
    </div>
  );
}
