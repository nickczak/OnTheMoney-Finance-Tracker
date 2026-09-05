/** Pick `count` "nice" tick values spanning [min, max] (0.25/0.5/1/2.5/5/10 steps). */
function niceTicks(min: number, max: number, count: number): number[] {
  const span = max - min;
  if (!Number.isFinite(span) || span <= 0)
    return Array.from({ length: count }, () => min);
  const rawStep = span / (count - 1);
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const norm = rawStep / mag;
  const step =
    (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) *
    mag;
  // Start low enough that the final tick covers the data max.
  const start = Math.min(
    Math.floor(min / step) * step,
    max - (count - 1) * step,
  );
  return Array.from({ length: count }, (_, i) =>
    Number((start + i * step).toFixed(6)),
  );
}

function formatTick(t: number): string {
  return Number.isInteger(t) ? String(t) : String(Number(t.toFixed(2)));
}

export default function AreaChart({
  data,
  height = 180,
  stroke = "#36e65d",
  yTicks = 4,
}: {
  data: number[];
  height?: number;
  stroke?: string;
  yTicks?: number;
}) {
  const width = 100;
  if (data.length === 0) return null;
  const n = data.length;
  const rawMin = Math.min(...data);
  const rawMax = Math.max(...data);
  const pad = (rawMax - rawMin) * 0.12 || 1;
  const ticks = niceTicks(rawMin - pad, rawMax + pad, yTicks);
  const tMin = ticks[0];
  const tMax = ticks[ticks.length - 1];
  const range = tMax - tMin || 1;

  const x = (i: number) => (i / (n - 1)) * width;
  const y = (v: number) => height - 8 - ((v - tMin) / range) * (height - 16);
  const line = data
    .map((v, i) => `${x(i).toFixed(2)},${y(v).toFixed(2)}`)
    .join(" ");

  return (
    <div className="relative w-full" style={{ height }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full"
        aria-hidden
      >
        <defs>
          <linearGradient id="area-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.3" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* gridlines */}
        {ticks.map((t, g) => (
          <line
            key={g}
            x1={0}
            y1={y(t)}
            x2={width}
            y2={y(t)}
            stroke="rgba(241,236,224,0.10)"
            strokeWidth={0.5}
            vectorEffect="non-scaling-stroke"
          />
        ))}

        {/* baseline */}
        <line
          x1={0}
          y1={height - 0.5}
          x2={width}
          y2={height - 0.5}
          stroke="rgba(241,236,224,0.18)"
          strokeWidth={0.75}
          vectorEffect="non-scaling-stroke"
        />

        <polygon
          points={`0,${height} ${line} ${width},${height}`}
          fill="url(#area-fill)"
        />
        <polyline
          points={line}
          fill="none"
          stroke={stroke}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {/* y-axis labels (HTML so they never distort) */}
      {ticks.map((t, g) => (
        <span
          key={g}
          className="absolute right-0 -translate-y-1/2 text-[9px] tabular-nums text-muted/80 leading-none"
          style={{ top: `${(y(t) / height) * 100}%` }}
        >
          {formatTick(t)}
        </span>
      ))}
    </div>
  );
}
