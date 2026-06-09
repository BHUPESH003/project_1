import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys — must match authStore
const ACCESS_TOKEN_KEY = '@auth/access_token';
const REFRESH_TOKEN_KEY = '@auth/refresh_token';

// ⚠️  Change API_URL to your backend address.
// For Android emulator: http://10.0.2.2:3000
// For physical device:  http://<your-machine-ip>:3000
const API_BASE_URL = 'http://10.0.2.2:3000';

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
apiClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// --- Response interceptor: 401 → refresh → retry ---
apiClient.interceptors.response.use(
  (res: AxiosResponse) => res,
  async (error) => {
    const original = error.config as AxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        // Queue requests while refresh in progress
        return new Promise<string>((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        }).then((newToken) => {
          original.headers = { ...original.headers, Authorization: `Bearer ${newToken}` };
          return apiClient(original);
        });
      }

      original._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {
          refreshToken,
        });
        const newToken: string = data.accessToken;

        await AsyncStorage.setItem(ACCESS_TOKEN_KEY, newToken);
        if (data.refreshToken) {
          await AsyncStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
        }

        refreshQueue.forEach((q) => q.resolve(newToken));
        refreshQueue = [];

        original.headers = { ...original.headers, Authorization: `Bearer ${newToken}` };
        return apiClient(original);
      } catch {
        refreshQueue.forEach((q) => q.reject(error));
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
    return err.response?.data?.message ?? err.message ?? 'Something went wrong';
  }
  if (err instanceof Error) return err.message;
  return 'Something went wrong';
}
