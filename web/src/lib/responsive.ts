import { useEffect, useState } from "react";

// Design reference width (iPhone 14). Large font sizes and fixed measurements
// scale from this so the UI stays proportionate on smaller and larger screens.
const BASE_WIDTH = 390;
const MIN_SCALE = 0.8;
const MAX_SCALE = 1.15;

export function useResponsiveLayout() {
  const [width, setWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => {
      setWidth(window.innerWidth);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const scale = Math.min(Math.max(width / BASE_WIDTH, MIN_SCALE), MAX_SCALE);
  const isMobile = width < 768;
  return { scale, width, isMobile };
}
