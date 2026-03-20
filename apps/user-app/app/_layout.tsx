/**
 * Root layout – QueryClient, SafeArea, auth restore, 401 session handling,
 * and global AddressSync (replaces old LocationSync).
 */
import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { useAuthStore } from '@/store/auth.store';
import { useAddressStore } from '@/store/address.store';
import { setOnSessionExpired } from '@/api/client';
import { ThemeProvider, useResolvedThemeMode } from '@/theme';
import { workSansFonts } from '@/constants/typography';
import { ToastHost } from '@/components/ToastHost';
import { AddressSelector } from '@/components/AddressSelector';

setOnSessionExpired(() => {
  useAuthStore.getState().clearSession();
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      staleTime: 30 * 1000,
    },
    mutations: {
      retry: 0,
    },
  },
});

function AuthSync() {
  const router = useRouter();
  const sessionExpired = useAuthStore((s) => s.sessionExpired);

  useEffect(() => {
    if (sessionExpired) {
      router.replace('/(system)/session-expired');
    }
  }, [sessionExpired, router]);

  return null;
}

/**
 * AddressSync – on app start:
 * 1. Zustand persist auto-restores selectedAddress from AsyncStorage.
 * 2. If no persisted address, fetch GPS location.
 * 3. If permission denied and still no address, show AddressSelector modal.
 */
function AddressSync() {
  const selectedAddress = useAddressStore((s) => s.selectedAddress);
  const loading = useAddressStore((s) => s.loading);
  const locationPermissionStatus = useAddressStore((s) => s.locationPermissionStatus);
  const fetchCurrentLocation = useAddressStore((s) => s.fetchCurrentLocation);
  const setSelectorVisible = useAddressStore((s) => s.setSelectorVisible);

  useEffect(() => {
    // If no address after persist hydration, try GPS
    if (!selectedAddress && !loading) {
      fetchCurrentLocation().then((addr) => {
        // If GPS failed (permission denied), force manual selection
        if (!addr) {
          setSelectorVisible(true);
        }
      });
    }
  }, []); // Run once on mount

  return null;
}

export default function RootLayout() {
  const restoreToken = useAuthStore((s) => s.restoreToken);
  const [fontsLoaded] = useFonts(workSansFonts);

  useEffect(() => {
    restoreToken();
  }, [restoreToken]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <SafeAreaProvider>
          <AppShell />
        </SafeAreaProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

function AppShell() {
  const resolvedThemeMode = useResolvedThemeMode();
  const selectorVisible = useAddressStore((s) => s.selectorVisible);
  const setSelectorVisible = useAddressStore((s) => s.setSelectorVisible);

  return (
    <>
      <StatusBar style={resolvedThemeMode === 'dark' ? 'light' : 'dark'} />
      <AuthSync />
      <AddressSync />
      <Stack screenOptions={{ headerShown: false }} />
      <ToastHost />
      <AddressSelector
        visible={selectorVisible}
        onClose={() => setSelectorVisible(false)}
      />
    </>
  );
}
