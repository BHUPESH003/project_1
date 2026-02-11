import React from 'react';
import { Redirect, Tabs } from 'expo-router';
import { useAuthStore } from '@/store/auth.store';

export default function TabsLayout() {
  const isAuthenticated = useAuthStore((s) => !!s.token && !!s.user);
  const sessionExpired = useAuthStore((s) => s.sessionExpired);

  if (!isAuthenticated && !sessionExpired) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
        }}
      />
    </Tabs>
  );
}
