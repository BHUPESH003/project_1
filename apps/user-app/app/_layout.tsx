import React, { useEffect } from 'react';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import useAuth from '@/hooks/useAuth';

const queryClient = new QueryClient();

export default function RootLayout() {
  const { restoreToken } = useAuth();

  useEffect(() => {
    restoreToken().catch(console.error);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
