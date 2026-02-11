/**
 * Secure token storage.
 * Uses SecureStore on native; falls back to AsyncStorage when SecureStore is unavailable (e.g. web).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const AUTH_TOKEN_KEY = 'authToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const AUTH_TOKEN_EXPIRES_AT_KEY = 'authTokenExpiresAt';

let SecureStore: { get: (k: string) => Promise<string | null>; set: (k: string, v: string) => Promise<void>; remove: (k: string) => Promise<void> } | null = null;
try {
  SecureStore = require('react-native-secure-store').default;
} catch {
  SecureStore = null;
}

const useSecureStore = SecureStore != null && Platform.OS !== 'web';

export const tokenStorage = {
  async getToken(): Promise<string | null> {
    if (useSecureStore) {
      try {
        return await SecureStore!.get(AUTH_TOKEN_KEY);
      } catch {
        return await AsyncStorage.getItem(AUTH_TOKEN_KEY);
      }
    }
    return AsyncStorage.getItem(AUTH_TOKEN_KEY);
  },

  async getRefreshToken(): Promise<string | null> {
    if (useSecureStore) {
      try {
        return await SecureStore!.get(REFRESH_TOKEN_KEY);
      } catch {
        return await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
      }
    }
    return AsyncStorage.getItem(REFRESH_TOKEN_KEY);
  },

  async setToken(token: string, expiresInSeconds?: number): Promise<void> {
    await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
    if (expiresInSeconds != null && expiresInSeconds > 0) {
      const expiresAt = Date.now() + expiresInSeconds * 1000;
      await AsyncStorage.setItem(AUTH_TOKEN_EXPIRES_AT_KEY, String(expiresAt));
    }
    if (useSecureStore) {
      try {
        await SecureStore!.set(AUTH_TOKEN_KEY, token);
      } catch {
        // AsyncStorage already set
      }
    }
  },

  async getTokenExpiresAt(): Promise<number | null> {
    try {
      const v = await AsyncStorage.getItem(AUTH_TOKEN_EXPIRES_AT_KEY);
      if (v == null) return null;
      const n = parseInt(v, 10);
      return Number.isNaN(n) ? null : n;
    } catch {
      return null;
    }
  },

  async setRefreshToken(token: string): Promise<void> {
    await AsyncStorage.setItem(REFRESH_TOKEN_KEY, token);
    if (useSecureStore) {
      try {
        await SecureStore!.set(REFRESH_TOKEN_KEY, token);
      } catch {
        // AsyncStorage already set
      }
    }
  },

  async clear(): Promise<void> {
    await AsyncStorage.multiRemove([AUTH_TOKEN_KEY, REFRESH_TOKEN_KEY, AUTH_TOKEN_EXPIRES_AT_KEY]);
    if (useSecureStore) {
      try {
        await SecureStore!.remove(AUTH_TOKEN_KEY);
        await SecureStore!.remove(REFRESH_TOKEN_KEY);
      } catch {
        // ignore
      }
    }
  },
};
