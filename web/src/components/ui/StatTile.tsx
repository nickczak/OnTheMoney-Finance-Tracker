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
    <div className="flex-1 rounded-[3px] bg-surface engraved p-4">
      <div className="text-[10px] uppercase tracking-[0.14em] text-muted">
        {label}
      </div>
      <div
        className={`font-serif font-semibold mt-1.5 tabular-nums text-[19px] text-primary ${valueClassName}`}
      >
        {value}
      </div>
      {children}
    </div>
  );
}
