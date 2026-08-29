import { Text } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { Tabs } from 'expo-router';

import Colors, { serif } from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';
import { useResponsiveLayout, WIDE_BAR_STYLE } from '@/constants/responsive';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { isDesktop } = useResponsiveLayout();

  const barStyle = isDesktop ? WIDE_BAR_STYLE : null;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme].tint,
        tabBarInactiveTintColor: '#48484a',
        headerStyle: { backgroundColor: '#000', ...barStyle },
        headerTintColor: '#fff',
        headerShadowVisible: false,
        headerTitleStyle: { fontFamily: serif },
        tabBarLabelStyle: { fontFamily: serif, fontSize: 11 },
        tabBarStyle: {
          backgroundColor: 'rgba(0,0,0,0.85)',
          borderWidth: 1,
          borderColor: '#2c2c2e',
          borderRadius: 28,
          elevation: 0,
          shadowOpacity: 0,
          shadowColor: 'transparent',
          shadowOffset: { height: 0, width: 0 },
          paddingTop: 8,
          paddingBottom: 8,
          height: 64,
          marginBottom: 8,
          marginHorizontal: 16,
          position: 'absolute',
          ...barStyle,
        },
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
              size={24}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="two"
        options={{
          title: 'Accounts',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{
                ios: 'lock.fill',
                android: 'lock',
                web: 'lock',
              }}
              tintColor={color}
              size={24}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="three"
        options={{
          title: 'Stocks',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{
                ios: 'chart.line.uptrend.xyaxis',
                android: 'trending_up',
                web: 'trending_up',
              }}
              tintColor={color}
              size={24}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="four"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{
                ios: 'person.fill',
                android: 'person',
                web: 'person',
              }}
              tintColor={color}
              size={24}
            />
          ),
        }}
      />
    </Tabs>
  );
}
