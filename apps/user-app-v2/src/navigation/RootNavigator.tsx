import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer, type LinkingOptions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '@/stores/authStore';
import { useAddressStore } from '@/stores/addressStore';
import { useAppStore } from '@/stores/appStore';
import { setOnSessionExpired } from '@/api/client';
import { AuthStack } from './AuthStack';
import { MainTabs } from './MainTabs';
import { useColors } from '@/theme';

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['localapp://'],
  config: {
    screens: {
      Main: {
        screens: {
          // Tab: Home
          Home: {
            screens: {
              Home: '',
              SellerDetail: 'sellers/:sellerId',
            },
          },
          // Tab: Orders
          Orders: {
            screens: {
              Orders: 'orders',
              OrderDetail: 'orders/:orderId',
            },
          },
        },
      },
    },
  },
};

export function RootNavigator() {
  const colors = useColors();
  const [ready, setReady] = useState(false);

  const isAuthenticated  = useAuthStore((s) => s.isAuthenticated);
  const sessionExpired   = useAuthStore((s) => s.sessionExpired);
  const markExpired      = useAuthStore((s) => s.markSessionExpired);
  const restoreSession   = useAuthStore((s) => s.restoreSession);
  const restoreAddress   = useAddressStore((s) => s.restoreAddress);
  const restoreAppState  = useAppStore((s) => s.restoreAppState);

  // Wire 401 session-expired callback before navigation mounts
  useEffect(() => {
    setOnSessionExpired(markExpired);
  }, [markExpired]);

  useEffect(() => {
    Promise.all([restoreSession(), restoreAddress(), restoreAppState()]).finally(() =>
      setReady(true),
    );
  }, [restoreSession, restoreAddress, restoreAppState]);

  if (!ready) {
    return (
      <View style={[styles.splash, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        {isAuthenticated && !sessionExpired ? (
          <Stack.Screen name="Main" component={MainTabs} />
        ) : (
          <Stack.Screen name="Auth" component={AuthStack} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
