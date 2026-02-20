/**
 * Root layout – QueryClient, SafeArea, auth restore and 401 session handling.
 */
import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { useAuthStore } from '@/store/auth.store';
import { setOnSessionExpired } from '@/api/client';
import { ThemeProvider, useResolvedThemeMode } from '@/theme';
import { workSansFonts } from '@/constants/typography';
import { ToastHost } from '@/components/ToastHost';

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

  return (
    <>
      <StatusBar style={resolvedThemeMode === 'dark' ? 'light' : 'dark'} />
      <AuthSync />
      <Stack screenOptions={{ headerShown: false }} />
      <ToastHost />
    </>
  );
}
