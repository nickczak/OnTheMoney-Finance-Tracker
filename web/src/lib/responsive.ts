import { useEffect, useState } from "react";

// Design reference width (iPhone 14). Large font sizes and fixed measurements
// scale from this so the UI stays proportionate on smaller and larger screens.
const BASE_WIDTH = 390;
const MIN_SCALE = 0.8;
const MAX_SCALE = 1.15;

// Above this width the viewport is treated as a desktop browser, and the
// phone-first layout switches from full-bleed to a centered content column.
export const DESKTOP_BREAKPOINT = 768;
// Max width of the centered content column on desktop.
export const CONTENT_MAX_WIDTH = 1100;

// Style fragment that centers a full-width bar (navigation header / tab bar)
// to the desktop content column.
export const WIDE_BAR_CLASS = "w-full max-w-[1100px] mx-auto";

export function useResponsiveLayout() {
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const { width, height } = windowSize;
  const scale = Math.min(Math.max(width / BASE_WIDTH, MIN_SCALE), MAX_SCALE);
  const isDesktop = width >= DESKTOP_BREAKPOINT;
  const isMobile = !isDesktop;
  return { scale, height, width, isDesktop, isMobile };
}
