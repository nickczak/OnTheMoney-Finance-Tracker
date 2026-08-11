import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import { serif } from '@/constants/Colors';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

export default function RootLayout() {
  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  // Override React Navigation's near-black dark theme (rgb(1,1,1) / rgb(18,18,18))
  // with pure jet black for every surface.
  const navTheme = {
    ...(colorScheme === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(colorScheme === 'dark' ? DarkTheme : DefaultTheme).colors,
      background: '#000',
      card: '#000',
      border: '#000',
    },
  };

  return (
    <>
      <StatusBar style="light" />
      <ThemeProvider value={navTheme}>
        <Stack screenOptions={{ headerTitleStyle: { fontFamily: serif } }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="account/[id]" options={{ headerShadowVisible: false, title: '' }} />
        </Stack>
      </ThemeProvider>
    </>
  );
}
