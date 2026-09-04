export default function Sparkline({
  data,
  width,
  height = 56,
  id,
  stroke = "#10e380",
}: {
  data: number[];
  width: number;
  height?: number;
  id: string;
  stroke?: string;
}) {
  if (data.length === 0) return null;
  const n = data.length;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = n > 1 ? width / (n - 1) : 0;
  const points = data.map(
    (v, i) =>
      `${(i * step + 0.5).toFixed(2)},${(height - 4 - ((v - min) / range) * (height - 8)).toFixed(2)}`,
  );
  const line = points.join(" ");

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={`grad-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.35" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`0.5,${height} ${line} ${width - 0.5},${height}`}
        fill={`url(#grad-${id})`}
      />
      <polyline
        points={line}
        fill="none"
        stroke={stroke}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={points[points.length - 1].split(",")[0]}
        cy={points[points.length - 1].split(",")[1]}
        r={3}
        fill={stroke}
      />
    </svg>
  );
}
