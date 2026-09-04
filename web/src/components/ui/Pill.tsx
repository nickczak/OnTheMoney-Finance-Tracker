import type { ButtonHTMLAttributes } from "react";

export function Pill({
  active,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { active: boolean }) {
  return (
    <button
      type="button"
      className={`px-4 py-1.5 rounded-full text-[13px] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${
        active
          ? "bg-brand-dim text-brand border border-brand/30 font-semibold"
          : "text-muted border border-border hover:text-primary hover:border-border-strong"
      } ${className}`}
      {...props}
    />
  );
}

export function PillGroup({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-row flex-wrap items-center gap-2 ${className}`}>
      {children}
    </div>
  );
}
