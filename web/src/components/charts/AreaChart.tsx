export default function AreaChart({
  data,
  height = 200,
  stroke = "#10e380",
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
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const x = (i: number) => (i / (n - 1)) * width;
  const y = (v: number) => height - 6 - ((v - min) / range) * (height - 12);
  const line = data
    .map((v, i) => `${x(i).toFixed(2)},${y(v).toFixed(2)}`)
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="w-full block"
      style={{ height }}
      aria-hidden
    >
      <defs>
        <linearGradient id="area-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.28" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* gridlines */}
      {Array.from({ length: yTicks }, (_, g) => {
        const gy = (g / (yTicks - 1)) * (height - 12) + 6;
        return (
          <line
            key={g}
            x1={0}
            y1={gy}
            x2={width}
            y2={gy}
            stroke="#1f2b36"
            strokeWidth={0.5}
            vectorEffect="non-scaling-stroke"
          />
        );
      })}
      <polygon
        points={`0,${height} ${line} ${width},${height}`}
        fill="url(#area-fill)"
      />
      <polyline
        points={line}
        fill="none"
        stroke={stroke}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
