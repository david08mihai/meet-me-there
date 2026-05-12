import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { theme, useThemeColors, useThemeMode } from '../../src/ui/theme';

const hiddenFlowOptions = {
  href: null,
  tabBarStyle: { display: 'none' },
} as const;

export default function AppLayout() {
  const colors = useThemeColors();
  const themeMode = useThemeMode();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: themeMode === 'dark' ? '#020617' : '#FFFFFF',
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 82,
          paddingTop: 8,
          paddingBottom: 10,
        },
        tabBarLabelStyle: {
          fontSize: theme.fontSize.xs,
          fontWeight: '700',
        },
      }}
    >
      <Tabs.Screen
        name="bookings"
        options={{
          title: 'Bookings',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Map',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="navigate-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen name="events" options={hiddenFlowOptions} />
      <Tabs.Screen name="chat" options={hiddenFlowOptions} />
      <Tabs.Screen name="payment" options={hiddenFlowOptions} />
    </Tabs>
  );
}
