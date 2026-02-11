/**
 * Root layout – QueryClient, SafeArea, auth restore and 401 session handling.
 */
import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { setOnSessionExpired } from '@/api/client';

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

  useEffect(() => {
    restoreToken();
  }, [restoreToken]);

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <AuthSync />
        <Stack screenOptions={{ headerShown: false }} />
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
