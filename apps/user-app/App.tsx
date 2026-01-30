import { useEffect } from 'react';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import useAuth from './src/hooks/useAuth';
import { Stack } from 'expo-router';

const queryClient = new QueryClient();

export default function App() {
  const { restoreToken } = useAuth();

  useEffect(() => {
    // Restore token on app start
    restoreToken().catch(console.error);
  }, []);

  return (
    
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <Stack />
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
