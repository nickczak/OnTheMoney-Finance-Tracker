import type { ReactNode } from "react";

/**
 * Dark engraved hero band used at the top of detail screens. Renders as a
 * plate with the classic double-rule frame and a faint inked texture.
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
      className={`relative overflow-hidden border-b border-[rgba(243,240,232,0.14)] shadow-[inset_0_0_60px_rgba(0,0,0,0.55),0_1px_0_rgba(0,0,0,0.8)] ${className}`}
    >
      <div className="relative">{children}</div>
    </div>
  );
}
