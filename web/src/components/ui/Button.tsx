import type { ButtonHTMLAttributes, ReactNode } from "react";
import { ArrowRight } from "lucide-react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-brand text-on-brand hover:bg-brand-bright active:scale-[0.98] font-semibold border border-black/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]",
  secondary:
    "bg-surface-2 text-primary border border-border-strong hover:bg-surface-3 hover:border-[#4d4d4d] active:scale-[0.98] font-medium",
  ghost:
    "text-muted hover:text-primary hover:bg-surface-2 transition-colors font-medium",
  danger:
    "bg-loss/10 text-loss hover:bg-loss/20 font-semibold border border-loss/25",
};

const SIZES: Record<Size, string> = {
  sm: "px-3 py-1.5 text-[12px] rounded-[2px] uppercase tracking-[0.08em]",
  md: "px-4 py-2.5 text-sm rounded-[2px]",
  lg: "px-5 py-3 text-[15px] rounded-[2px]",
};

export default function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  showArrow = false,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  /** Trailing "→" arrow, like the kit's Get started / View details buttons. */
  showArrow?: boolean;
}) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    >
      {children as ReactNode}
      {showArrow ? <ArrowRight size={16} strokeWidth={2.4} /> : null}
    </button>
  );
}
