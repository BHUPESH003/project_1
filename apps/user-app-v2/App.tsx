/**
 * Hyperlocal Commerce — User App
 */
import React, { useEffect } from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider, onlineManager } from '@tanstack/react-query';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { ThemeProvider } from '@/theme';
import { ToastHost } from '@/components/ui/Toast';
import { NetworkBanner } from '@/components/layout/NetworkBanner';
import { RootNavigator } from '@/navigation/RootNavigator';
import { initSentry, setUser, clearUser } from '@/utils/sentry';
import { usePendingPaymentCheck } from '@/hooks/usePendingPaymentCheck';
import { useAuthStore } from '@/stores/authStore';

// Initialize Sentry once, before the component tree mounts.
// Replace the empty string with your DSN from sentry.io when ready.
const SENTRY_DSN = '';
initSentry(SENTRY_DSN);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      networkMode: 'offlineFirst',
    },
    mutations: {
      retry: 0,
    },
  },
});

// Keep React Query's online manager in sync with device network state.
interface _NetInfoState { isConnected: boolean | null }
interface _NetInfo { addEventListener: (cb: (s: _NetInfoState) => void) => () => void }
let _NetInfo: _NetInfo | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  _NetInfo = require('@react-native-community/netinfo').default as _NetInfo;
} catch {
  // not linked yet — queries fall back to normal behavior
}
if (_NetInfo) {
  onlineManager.setEventListener((setOnline) =>
    _NetInfo!.addEventListener((state) => {
      setOnline(state.isConnected ?? true);
    }),
  );
}

function AppContent() {
  const scheme = useColorScheme();
  const user = useAuthStore((s) => s.user);

  // Sync authenticated user with Sentry for error attribution
  useEffect(() => {
    if (user) {
      setUser(user.id, user.phone);
    } else {
      clearUser();
    }
  }, [user]);

  // Surface a toast if any order is stuck in PENDING_PAYMENT on launch
  usePendingPaymentCheck();

  return (
    <>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'}
      />
      <RootNavigator />
      <ToastHost />
      <NetworkBanner />
    </>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <ThemeProvider>
            <BottomSheetModalProvider>
              <AppContent />
            </BottomSheetModalProvider>
          </ThemeProvider>
        </SafeAreaProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
