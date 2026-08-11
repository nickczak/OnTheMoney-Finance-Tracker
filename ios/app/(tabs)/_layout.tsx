import { SymbolView } from 'expo-symbols';
import { Tabs } from 'expo-router';

import Colors, { palette, sans } from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme].tint,
        tabBarInactiveTintColor: '#48484a',
        // Charcoal header and tab bar.
        headerStyle: { backgroundColor: palette.bg },
        headerTintColor: '#fff',
        headerShadowVisible: false,
        headerTitleStyle: { fontFamily: sans, fontWeight: '600' },
        tabBarLabelStyle: { fontFamily: sans },
        tabBarStyle: {
          backgroundColor: palette.surface,
          // Remove the default hairline/shadow line above the tab bar.
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
          shadowColor: 'transparent',
          shadowOffset: { height: 0, width: 0 },
        },
        // Disable the static render of the header on web
        // to prevent a hydration error in React Navigation v6.
        headerShown: useClientOnlyValue(false, true),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Portfolio',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{
                ios: 'building.columns.fill',
                android: 'account_balance',
                web: 'account_balance',
              }}
              tintColor={color}
              size={28}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="two"
        options={{
          title: 'Accounts',
          headerStyle: { backgroundColor: palette.bg },
          headerTintColor: '#fff',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{
                ios: 'lock.fill',
                android: 'lock',
                web: 'lock',
              }}
              tintColor={color}
              size={28}
            />
          ),
        }}
      />
    </Tabs>
  );
}
