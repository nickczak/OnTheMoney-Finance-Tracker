import { Pressable, Text } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { Tabs } from 'expo-router';

import Colors, { serif } from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';
import { useAuth } from '@/lib/AuthContext';
import { useResponsiveLayout, WIDE_BAR_STYLE } from '@/constants/responsive';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { signOut } = useAuth();
  const { isWide } = useResponsiveLayout();

  // On desktop the header and tab bar are constrained to the centered content
  // column instead of stretching across the whole monitor.
  const barStyle = isWide ? WIDE_BAR_STYLE : null;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme].tint,
        tabBarInactiveTintColor: '#48484a',
        // Jet black header and tab bar.
        headerStyle: { backgroundColor: '#000', ...barStyle },
        headerTintColor: '#fff',
        headerShadowVisible: false,
        headerTitleStyle: { fontFamily: serif },
        tabBarLabelStyle: { fontFamily: serif },
        headerRight: () => (
          <Pressable onPress={() => void signOut()} hitSlop={8} style={styles.logoutButton}>
            <LogoutLabel />
          </Pressable>
        ),
        tabBarStyle: {
          backgroundColor: '#000',
          // Remove the default hairline/shadow line above the tab bar.
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
          shadowColor: 'transparent',
          shadowOffset: { height: 0, width: 0 },
          ...barStyle,
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
                ios: 'scroll.fill',
                android: 'description',
                web: 'description',
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
          headerStyle: { backgroundColor: '#000', ...barStyle },
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
      <Tabs.Screen
        name="three"
        options={{
          title: 'Stocks',
          headerStyle: { backgroundColor: '#000', ...barStyle },
          headerTintColor: '#fff',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{
                ios: 'chart.line.uptrend.xyaxis',
                android: 'trending_up',
                web: 'trending_up',
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

function LogoutLabel() {
  return <Text style={{ fontFamily: serif, color: '#fff', fontSize: 15 }}>Logout</Text>;
}

const styles = { logoutButton: { marginRight: 12 } };
