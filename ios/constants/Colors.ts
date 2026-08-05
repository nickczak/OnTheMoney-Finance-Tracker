const tintColorLight = '#2f95dc';
// iOS system green — matches the card amounts for a cohesive finance accent.
const tintColorDark = '#30d158';

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
