import { Platform } from 'react-native';

// Old-bank serif typeface used across the whole app.
export const serif = Platform.select({ ios: 'Times New Roman', default: 'serif' });

const tintColorLight = '#00ff88';
// Neon green — matches the net-worth graph line.
const tintColorDark = '#00ff88';

export default {
  light: {
    text: '#000',
    background: '#fff',
    tint: tintColorLight,
    tabIconDefault: '#ccc',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#fff',
    background: '#000',
    tint: tintColorDark,
    // Muted gray for inactive tab icons — #ccc (light mode's value) is too
    // bright against a black tab bar.
    tabIconDefault: '#48484a',
    tabIconSelected: tintColorDark,
  },
};
