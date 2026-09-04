import { formatMoney } from "@/lib/format";

export default function ChangePill({
  amount,
  percent,
  up,
  suffix,
  onDark = false,
}: {
  amount: number;
  percent: number | null;
  up: boolean;
  suffix?: string;
  onDark?: boolean;
}) {
  const gain = up ? "#16c784" : "#ff5c5c";
  const color = onDark ? (up ? "#5fe3a8" : "#ff8080") : gain;
  const arrow = up ? "▲" : "▼";
  return (
    <span
      className="inline-flex items-center gap-1.5 font-semibold text-sm tabular-nums"
      style={{ color }}
    >
      <span className="text-[12px]">{arrow}</span>
      <span>
        ${formatMoney(Math.abs(amount))}
        {percent !== null && percent !== undefined ? (
          <>
            {" "}
            <span className={onDark ? "opacity-70" : "opacity-80"}>
              ({up ? "+" : "-"}
              {Math.abs(percent).toFixed(1)}%)
            </span>
          </>
        ) : null}
      </span>
      {suffix ? (
        <span
          className={`font-normal text-[13px] ${
            onDark ? "text-[#9db8c9]" : "text-muted-2"
          }`}
        >
          {suffix}
        </span>
      ) : null}
    </span>
  );
}
