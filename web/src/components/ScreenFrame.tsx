import type { HTMLAttributes } from "react";

import { useResponsiveLayout } from "@/lib/responsive";

/**
 * Centers screen content in a fixed-width column on desktop so the phone-first
 * UI doesn't stretch edge-to-edge on wide monitors. Phones get the full width.
 */
export default function ScreenFrame({
  className = "",
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  const { isDesktop } = useResponsiveLayout();
  return (
    <div
      className={`w-full bg-black ${isDesktop ? "max-w-[1100px] mx-auto" : ""} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
