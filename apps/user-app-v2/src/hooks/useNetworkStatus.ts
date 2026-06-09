import { useState, useEffect } from 'react';

// Minimal shape we need from NetInfo — avoids hard dep on the package at type-check time.
interface NetInfoState {
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
}
interface NetInfoStatic {
  fetch: () => Promise<NetInfoState>;
  addEventListener: (cb: (s: NetInfoState) => void) => () => void;
}

let NetInfo: NetInfoStatic | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  NetInfo = require('@react-native-community/netinfo').default as NetInfoStatic;
} catch {
  // package not yet linked — all consumers treat null as "unknown"
}

export interface NetworkStatus {
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
  isOffline: boolean;
}

export function useNetworkStatus(): NetworkStatus {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isInternetReachable, setIsInternetReachable] = useState<boolean | null>(null);

  useEffect(() => {
    if (!NetInfo) return;

    NetInfo.fetch().then((state) => {
      setIsConnected(state.isConnected ?? null);
      setIsInternetReachable(state.isInternetReachable ?? null);
    });

    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(state.isConnected ?? null);
      setIsInternetReachable(state.isInternetReachable ?? null);
    });

    return unsubscribe;
  }, []);

  return {
    isConnected,
    isInternetReachable,
    isOffline: isConnected === false || isInternetReachable === false,
  };
}
