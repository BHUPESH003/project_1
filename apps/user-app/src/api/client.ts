/**
 * Axios instance with auth interceptor.
 * Backend wraps responses in { code, data, message }; use unwrap in API modules.
 *
 * Localhost: On device/emulator, "localhost" is the device itself. We map it so:
 * - Android emulator: localhost → 10.0.2.2 (host machine)
 * - Physical device: set EXPO_PUBLIC_API_BASE_URL to your computer's LAN IP (e.g. http://192.168.1.x:3000/api)
 */

import axios, { AxiosError, AxiosInstance } from 'axios';
import { Platform } from 'react-native';
import { ENV } from '@/constants/env';
import { tokenStorage } from '@/lib/token-storage';

function getBaseURL(): string {
  const url = ENV.API_BASE_URL;
  // Android emulator: localhost is the emulator; use 10.0.2.2 to reach host machine
  if (Platform.OS === 'android' && (url.includes('localhost') || url.includes('127.0.0.1'))) {
    return url.replace(/localhost|127\.0\.0\.1/, '10.0.2.2');
  }
  return url;
}

const client: AxiosInstance = axios.create({
  baseURL: getBaseURL(),
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/** Called on 401 after refresh failure – clear tokens and show session expired. */
let onSessionExpired: (() => void) | null = null;
export function setOnSessionExpired(callback: () => void): void {
  onSessionExpired = callback;
}

/** Single-flight refresh: only one refresh in progress; all 401s wait and retry with the new token. */
let refreshPromise: Promise<string | null> | null = null;

function isRefreshRequest(url: string | undefined): boolean {
  return typeof url === 'string' && url.includes('refresh-token');
}

const REFRESH_BUFFER_MS = 2 * 60 * 1000; // Refresh if token expires within 2 minutes

async function doRefresh(): Promise<string | null> {
  const refreshToken = await tokenStorage.getRefreshToken();
  if (!refreshToken) return null;
  try {
    const { authApi } = await import('./auth.api');
    const resp = await authApi.refreshToken(refreshToken);
    if (resp?.accessToken) {
      await tokenStorage.setToken(resp.accessToken, resp.accessTokenExpiresIn);
      return resp.accessToken;
    }
  } catch {
    // Refresh failed
  }
  return null;
}

/** Decode JWT payload (no verify) to get exp in ms. Returns null on parse error. */
function getExpiresAtFromToken(token: string): number | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const b64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json =
      typeof atob !== 'undefined'
        ? atob(b64)
        : (globalThis as any).Buffer?.from(b64, 'base64')?.toString('utf8') ?? '';
    const decoded = JSON.parse(json);
    const exp = decoded?.exp;
    return typeof exp === 'number' ? exp * 1000 : null;
  } catch {
    return null;
  }
}

/** Returns a valid token, refreshing proactively if it expires within 2 minutes. */
async function getValidToken(): Promise<string | null> {
  const token = await tokenStorage.getToken();
  if (!token) return null;
  let expiresAt = await tokenStorage.getTokenExpiresAt();
  if (expiresAt == null) expiresAt = getExpiresAtFromToken(token);
  if (expiresAt != null && Date.now() <= expiresAt - REFRESH_BUFFER_MS) {
    return token;
  }
  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

client.interceptors.request.use(
  async (config) => {
    // Skip Authorization for refresh-token so we don't send expired token
    const isRefresh = isRefreshRequest(config.url);
    if (!isRefresh) {
      const token = await getValidToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

client.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (!error.response) {
      return Promise.reject(error);
    }
    if (error.response.status !== 401) {
      return Promise.reject(error);
    }
    if (isRefreshRequest(error.config?.url)) {
      await tokenStorage.clear();
      onSessionExpired?.();
      return Promise.reject(error);
    }
    // Single-flight: one refresh at a time; all 401s wait for the same result
    if (!refreshPromise) {
      refreshPromise = doRefresh().finally(() => {
        refreshPromise = null;
      });
    }
    const newToken = await refreshPromise;
    if (newToken && error.config?.headers) {
      error.config.headers.Authorization = `Bearer ${newToken}`;
      return client.request(error.config);
    }
    await tokenStorage.clear();
    onSessionExpired?.();
    return Promise.reject(error);
  }
);

export default client;
