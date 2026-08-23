import { useWindowDimensions } from 'react-native';

// Design reference width (iPhone 14). Large font sizes and fixed measurements
// scale from this so the UI stays proportionate on smaller and larger phones.
const BASE_WIDTH = 390;
const MIN_SCALE = 0.8;
const MAX_SCALE = 1.15;

export function useResponsiveLayout() {
  const { width, height } = useWindowDimensions();
  const scale = Math.min(Math.max(width / BASE_WIDTH, MIN_SCALE), MAX_SCALE);
  return { scale, height, width };
}
