import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from 'react-native-config';

// Storage keys — must match authStore
const ACCESS_TOKEN_KEY = '@auth/access_token';
const REFRESH_TOKEN_KEY = '@auth/refresh_token';

// API base URL should point to the API root, not just the host.
// If API_URL does not already include `/api`, append it here to match Nest's global prefix.
// const rawApiUrl = Config.API_URL?.trim() || 'http://10.0.2.2:3000';
const rawApiUrl = 'https://b44a-202-66-164-178.ngrok-free';
const API_BASE_URL = rawApiUrl.replace(/\/+$/, '').endsWith('/api')
  ? rawApiUrl.replace(/\/+$/, '')
  : `${rawApiUrl.replace(/\/+$/, '')}/api`;

let onSessionExpiredCallback: (() => void) | null = null;
let isRefreshing = false;
let refreshQueue: Array<{
  resolve: (value: string) => void;
  reject: (error: unknown) => void;
}> = [];

export function setOnSessionExpired(cb: () => void) {
  onSessionExpiredCallback = cb;
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

// --- Request interceptor: attach JWT ---
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
);

// --- Response interceptor: unwrap TransformInterceptor envelope + 401 refresh ---
apiClient.interceptors.response.use(
  (res: AxiosResponse) => {
    // Backend wraps every response: { code, data, message }
    // Unwrap so callers always receive the inner payload via r.data
    if (
      res.data !== null &&
      typeof res.data === 'object' &&
      'code' in res.data &&
      'data' in res.data &&
      'message' in res.data
    ) {
      return { ...res, data: res.data.data };
    }
    return res;
  },
  async error => {
    const original = error.config as AxiosRequestConfig & { _retry?: boolean };

    // Auth endpoints return 401 for invalid credentials, not for expired tokens —
    // never trigger the token-refresh flow for them.
    const url = original?.url ?? '';
    const isAuthEndpoint = url.includes('/auth/');

    if (error.response?.status === 401 && !original._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        // Queue requests while refresh in progress
        return new Promise<string>((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        }).then(newToken => {
          original.headers = {
            ...original.headers,
            Authorization: `Bearer ${newToken}`,
          };
          return apiClient(original);
        });
      }

      original._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
        if (!refreshToken) throw new Error('No refresh token');

        const { data: raw } = await axios.post(
          `${API_BASE_URL}/auth/refresh-token`,
          {
            refreshToken,
          },
        );
        // Unwrap TransformInterceptor envelope if present
        const payload =
          raw?.code !== undefined && raw?.data !== undefined ? raw.data : raw;
        const newToken: string = payload.accessToken;

        await AsyncStorage.setItem(ACCESS_TOKEN_KEY, newToken);
        if (payload.refreshToken) {
          await AsyncStorage.setItem(REFRESH_TOKEN_KEY, payload.refreshToken);
        }

        refreshQueue.forEach(q => q.resolve(newToken));
        refreshQueue = [];

        original.headers = {
          ...original.headers,
          Authorization: `Bearer ${newToken}`,
        };
        return apiClient(original);
      } catch {
        refreshQueue.forEach(q => q.reject(error));
        refreshQueue = [];
        await AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY]);
        onSessionExpiredCallback?.();
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

// Helper: extract error message from any shape
export function getErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const body = err.response?.data;
    // Unwrap TransformInterceptor envelope: { code, data, message }
    const message = body?.message ?? err.message ?? 'Something went wrong';
    return message;
  }
  if (err instanceof Error) return err.message;
  return 'Something went wrong';
}
