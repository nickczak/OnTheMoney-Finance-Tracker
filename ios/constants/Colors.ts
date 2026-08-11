import { Platform } from 'react-native';

// Clean sans typeface matching the NoPixel 3.0 phone.
export const sans = Platform.select({ ios: '-apple-system', default: 'sans-serif' });

// NoPixel 3.0 phone palette
export const palette = {
  bg: '#0b0b0c',
  surface: '#16161a',
  surfaceAlt: '#1c1c20',
  border: '#26262a',
  text: '#ffffff',
  textDim: '#8a8a90',
  green: '#04b543',
  blue: '#2f84dd',
  red: '#e5484d',
};

const tintColor = palette.green;

export default {
  light: {
    text: '#000',
    background: '#fff',
    tint: tintColor,
    tabIconDefault: '#ccc',
    tabIconSelected: tintColor,
  },
  dark: {
    text: '#fff',
    background: palette.bg,
    tint: tintColor,
    // Muted gray for inactive tab icons — #ccc (light mode's value) is too
    // bright against a dark tab bar.
    tabIconDefault: '#48484a',
    tabIconSelected: tintColor,
  },
};
