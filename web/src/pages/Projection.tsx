import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { useResponsiveLayout } from "@/lib/responsive";
import { fetchTotalAssets, projectRetirement } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import type { Projection } from "@/types/Projection";

function Field({
  value,
  onChange,
  type,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder: string;
}) {
  return (
    <input
      className="w-full flex-1 bg-surface-2 text-primary font-serif text-lg outline-none border border-border rounded-lg px-4 py-2.5 mb-3 focus:border-[#009ddc]/60 placeholder:text-muted-2 tabular-nums transition-colors"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      type={type}
      placeholder={placeholder}
    />
  );
}

function ProjLineChart({ result }: { result: Projection }) {
  const { scale } = useResponsiveLayout();
  const width = 340 * scale;
  const height = 220;
  const pad = 8;

  const series = [
    { data: result.worst10Trajectory, color: "#c8443d" },
    { data: result.medianTrajectory, color: "#c8862b" },
    { data: result.meanTrajectory, color: "#0078a8" },
    { data: result.best10Trajectory, color: "#16895f" },
  ];

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

  const toPolyline = (data: number[]) =>
    data.map((v, i) => point(i, v)).join(" ");

  const ticks = [0, 0.25, 0.5, 0.75, 1];
  const xTicks = ticks.map((f) => Math.round(result.years * f));

  return (
    <div className="mt-4 mb-6">
      <div className="bg-white border border-border rounded-xl p-2 flex items-center">
        <svg width={width} height={height}>
          {ticks.map((g) => {
            const y = height - pad - g * (height - pad * 2);
            return (
              <line
                key={g}
                x1={0}
                y1={y}
                x2={width}
                y2={y}
                stroke="#dbe3e8"
                strokeWidth={1}
              />
            );
          })}
          {series.map((s) => (
            <polyline
              key={s.color}
              points={toPolyline(s.data)}
              fill="none"
              stroke={s.color}
              strokeWidth={2}
            />
          ))}
        </svg>
      </div>
      <div className="flex flex-row justify-between mt-1 pl-0.5">
        {xTicks.map((y) => (
          <span key={y} className="font-serif text-[10px] text-muted">
            {y}
          </span>
        ))}
      </div>
      <div className="font-serif text-[11px] italic text-muted mt-1 text-center">
        Year
      </div>
    </div>
  );
}

export default function Projection() {
  const { scale, height, isDesktop } = useResponsiveLayout();
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

  return (
    <div
      className={`min-h-full bg-bg overflow-auto ${isDesktop ? "max-w-[1100px] mx-auto" : ""}`}
    >
      <div className="p-5 pb-20">
        <div
          className="font-serif font-bold text-primary"
          style={{ fontSize: 28 * scale }}
        >
          Retirement Projection
        </div>
        <div className="font-serif text-muted mt-1.5 mb-5">
          Runs thousands of random market simulations to project your retirement
          savings.
        </div>

        {error ? (
          <div className="font-serif text-loss mt-4">{error}</div>
        ) : null}

        {result ? (
          <div className="mt-6">
            <div className="font-serif text-lg font-bold text-primary mb-2.5">
              Projected balance after {result.years} years
            </div>
            <ProjLineChart result={result} />
            <div className="flex flex-row justify-between gap-3 mb-2">
              <div className="flex-1 bg-surface border border-border rounded-xl p-4 shadow-sm">
                <div className="font-serif text-[11px] uppercase tracking-widest text-muted">
                  Worst 10%
                </div>
                <div className="font-serif text-loss mt-1.5 tabular-nums">
                  ${formatMoney(result.worst10)}
                </div>
              </div>
              <div className="flex-1 bg-surface border border-border rounded-xl p-4 shadow-sm">
                <div className="font-serif text-[11px] uppercase tracking-widest text-muted">
                  Median
                </div>
                <div className="font-serif text-warning mt-1.5 tabular-nums">
                  ${formatMoney(result.median)}
                </div>
              </div>
            </div>
            <div className="flex flex-row justify-between gap-3 mb-2">
              <div className="flex-1 bg-surface border border-border rounded-xl p-4 shadow-sm">
                <div className="font-serif text-[11px] uppercase tracking-widest text-muted">
                  Best 10%
                </div>
                <div className="font-serif text-gain mt-1.5 tabular-nums">
                  ${formatMoney(result.best10)}
                </div>
              </div>
              <div className="flex-1 bg-surface border border-border rounded-xl p-4 shadow-sm">
                <div className="font-serif text-[11px] uppercase tracking-widest text-muted">
                  Mean
                </div>
                <div className="font-serif text-primary mt-1.5 tabular-nums">
                  ${formatMoney(result.mean)}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div
          className="bg-surface border border-border rounded-xl p-5 shadow-sm"
          style={{ maxHeight: Math.min(520, height * 0.9) }}
        >
          <Field
            value={initial}
            onChange={setInitial}
            type="number"
            placeholder="Initial balance"
          />
          <Field
            value={contribution}
            onChange={setContribution}
            type="number"
            placeholder="Monthly contribution"
          />
          <Field
            value={rate}
            onChange={setRate}
            type="number"
            placeholder="Return rate % (e.g. 7)"
          />
          <Field
            value={years}
            onChange={setYears}
            type="number"
            placeholder="Years (e.g. 30)"
          />
          <Field
            value={sims}
            onChange={setSims}
            type="number"
            placeholder="Simulations (≤ 100000)"
          />
          {formError ? (
            <div className="font-serif text-loss text-[13px] text-center mb-1">
              {formError}
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => run()}
            className="w-full rounded-lg bg-brand py-3 flex items-center justify-center hover:bg-brand-pressed active:scale-[0.99] transition-all mt-2"
          >
            {loading ? (
              <Loader2 className="animate-spin" color="#002233" />
            ) : (
              <span className="font-serif text-base font-bold tracking-wide text-on-blue">
                Run Projection
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
