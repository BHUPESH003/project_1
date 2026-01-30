/**
 * Axios instance with auth interceptor
 * All API requests go through this client
 */

import axios, { AxiosError, AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ENV } from '@/constants/env';

const client: AxiosInstance = axios.create({
  baseURL: ENV.API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request interceptor: Attach auth token
 */
client.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Response interceptor: Handle errors
 */
client.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    // Handle network errors
    if (!error.response) {
      console.error('Network error:', error.message);
    }
    // Handle API errors
    if (error.response?.status === 401) {
      // Attempt token refresh
      try {
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        if (!refreshToken) throw error;

        // Import here to avoid circular dependency
        const { authApi } = await import('./auth.api');
        const resp = await authApi.refreshToken(refreshToken);
        if (resp?.token) {
          await AsyncStorage.setItem('authToken', resp.token);
          // Retry original request with new token
          if (error.config && error.config.headers) {
            error.config.headers.Authorization = `Bearer ${resp.token}`;
          }
          return client.request(error.config!);
        }
      } catch (e) {
        // If refresh fails, clear tokens and propagate original error
        await AsyncStorage.removeItem('authToken');
        await AsyncStorage.removeItem('refreshToken');
      }
    }
    return Promise.reject(error);
  }
);

export default client;
