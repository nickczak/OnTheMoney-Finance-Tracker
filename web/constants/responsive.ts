import { StyleSheet, useWindowDimensions } from 'react-native';

// Design reference width (iPhone 14). Large font sizes and fixed measurements
// scale from this so the UI stays proportionate on smaller and larger phones.
const BASE_WIDTH = 390;
const MIN_SCALE = 0.8;
const MAX_SCALE = 1.15;

// Above this width the viewport is treated as a desktop browser, and the
// phone-first layout switches from full-bleed to a centered content column.
export const DESKTOP_BREAKPOINT = 768;
// Max width of the centered content column on desktop. Shared by the headers,
// tab bar, and every screen so the whole app lines up on wide monitors. Wider
// than the phone column so desktop browsers put more of the screen to use.
export const CONTENT_MAX_WIDTH = 1100;

// Style fragment that centers a full-width bar (navigation header / tab bar)
// to the desktop content column. Phones pass `isDesktop = false` and keep the
// full-bleed bar, so nothing changes there.
export const WIDE_BAR_STYLE = {
  width: '100%' as const,
  maxWidth: CONTENT_MAX_WIDTH,
  alignSelf: 'center' as const,
  marginHorizontal: 'auto' as const,
};

export function useResponsiveLayout() {
  const { width, height } = useWindowDimensions();
  const scale = Math.min(Math.max(width / BASE_WIDTH, MIN_SCALE), MAX_SCALE);
  const isDesktop = width >= DESKTOP_BREAKPOINT;
  const isMobile = !isDesktop;
  return { scale, height, width, isDesktop, isMobile };
}
