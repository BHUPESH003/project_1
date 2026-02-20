import React from 'react';
import { Redirect, Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '@/theme';
import { fontFamily } from '@/constants/typography';
import { useAuthStore } from '@/store/auth.store';

export default function TabsLayout() {
  const isAuthenticated = useAuthStore((s) => !!s.token && !!s.user);
  const sessionExpired = useAuthStore((s) => s.sessionExpired);
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  if (!isAuthenticated && !sessionExpired) {
    return <Redirect href="/(auth)/login" />;
  }

  const getTabIcon = (routeName: 'home' | 'orders' | 'profile', focused: boolean) => {
    const iconColor = focused ? colors.primary : colors.textMuted;
    const iconSize = 24;
    if (routeName === 'home') return <MaterialIcons name="storefront" size={iconSize} color={iconColor} />;
    if (routeName === 'orders') return <MaterialIcons name="shopping-bag" size={iconSize} color={iconColor} />;
    return <MaterialIcons name="person" size={iconSize} color={iconColor} />;
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          height: 64 + insets.bottom,
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 10),
          borderTopWidth: 1,
          borderTopColor: colors.border,
          backgroundColor: colors.surface,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontFamily: fontFamily.medium,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => getTabIcon('home', focused),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
          tabBarIcon: ({ focused }) => getTabIcon('orders', focused),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => getTabIcon('profile', focused),
        }}
      />
    </Tabs>
  );
}
