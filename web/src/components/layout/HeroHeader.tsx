import type { ReactNode } from "react";

/**
 * Premium dark hero band used at the top of the Portfolio and Account screens.
 * Renders a green-tinted gradient with soft glow orbs behind arbitrary content.
 */
export default function HeroHeader({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden bg-[linear-gradient(160deg,#133024_0%,#0d2430_50%,#0b1118_100%)] ${className}`}
    >
      <div
        aria-hidden
        className="absolute -top-24 -right-14 w-64 h-64 rounded-full bg-brand/20 blur-3xl"
      />
      <div
        aria-hidden
        className="absolute -bottom-28 -left-12 w-56 h-56 rounded-full bg-info/10 blur-3xl"
      />
      <div className="relative">{children}</div>
    </div>
  );
}
