import type { ReactNode } from "react";

export default function StatTile({
  label,
  value,
  valueClassName = "",
  children,
}: {
  label: ReactNode;
  value: ReactNode;
  valueClassName?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex-1 rounded-2xl bg-surface border border-border p-4 shadow-[0_8px_24px_rgba(0,0,0,0.25)]">
      <div className="text-[11px] uppercase tracking-[0.12em] text-muted">
        {label}
      </div>
      <div
        className={`font-semibold mt-1.5 tabular-nums text-[17px] text-primary ${valueClassName}`}
      >
        {value}
      </div>
      {children}
    </div>
  );
}
