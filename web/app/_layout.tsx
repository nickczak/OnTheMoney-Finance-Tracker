import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import AuthScreen from '@/components/AuthScreen';
import { useColorScheme } from '@/components/useColorScheme';
import { serif } from '@/constants/Colors';
import { useResponsiveLayout, WIDE_BAR_STYLE } from '@/constants/responsive';
import { AuthProvider, useAuth } from '@/lib/AuthContext';

// Keep the native splash (logo on black) visible until the dashboard has
// finished loading its data, so the logo is the only thing shown at launch
// (the auto-hide would otherwise reveal the app's loading spinner mid-frame).
SplashScreen.preventAutoHideAsync().catch(() => {
  // Ignore — the splash may already be hidden (e.g. fast refresh).
});

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { isDesktop } = useResponsiveLayout();
  // Session gate: restore the persisted session before revealing anything.
  const { user, loading } = useAuth();

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

  // Keep the native splash up until the session is restored (signed-in launches
  // then stay covered until the dashboard data lands, see (tabs)/index.tsx).
  if (loading) return null;

  // Not signed in: show the auth screen instead of the app.
  if (!user) {
    return (
      <>
        <StatusBar style="light" />
        <AuthScreen />
      </>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <ThemeProvider value={navTheme}>
        <Stack
          screenOptions={{
            headerTitleStyle: { fontFamily: serif },
            // White back arrow / header controls to match the jet-black theme
            // (the default blue comes from the navigation theme's primary tint).
            headerTintColor: '#fff',
            // Desktop: constrain the header to the centered content column.
            headerStyle: isDesktop ? { backgroundColor: '#000', ...WIDE_BAR_STYLE } : undefined,
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="account/[id]"
            options={{
              headerShadowVisible: false,
              title: '',
              // Hide the "(tabs)" label that React Navigation shows next to the
              // back arrow (it defaults to the previous route's name).
              headerBackButtonDisplayMode: 'minimal',
            }}
          />
          <Stack.Screen
            name="projection"
            options={{
              headerShadowVisible: false,
              title: 'Projection',
              headerBackButtonDisplayMode: 'minimal',
            }}
          />
        </Stack>
      </ThemeProvider>
    </>
  );
}
