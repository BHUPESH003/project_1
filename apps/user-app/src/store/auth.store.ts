/**
 * Auth Zustand Store
 * Manages authentication state, token storage, login/logout
 * Token is persisted to AsyncStorage
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi } from '@/api/auth.api';

export interface AuthUser {
  id: string;
  phoneNumber: string;
  name?: string;
}

interface AuthState {
  // State
  token: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setToken: (token: string, refreshToken: string) => void;
  setUser: (user: AuthUser) => void;
  logout: () => Promise<void>;
  clearError: () => void;

  // Login flow
  login: (phoneNumber: string) => Promise<void>;
  verifyOtp: (phoneNumber: string, otp: string) => Promise<void>;
  
  // Recovery
  restoreToken: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      token: null,
      refreshToken: null,
      user: null,
      isLoading: false,
      error: null,

      // Basic setters
      setToken: (token: string, refreshToken: string) => {
        // Persist tokens to AsyncStorage for the axios client
        AsyncStorage.setItem('authToken', token).catch(() => {});
        if (refreshToken) AsyncStorage.setItem('refreshToken', refreshToken).catch(() => {});
        set({ token, refreshToken, error: null });
      },

      setUser: (user: AuthUser) => {
        set({ user });
      },

      clearError: () => {
        set({ error: null });
      },

      // Logout
      logout: async () => {
        try {
          set({ isLoading: true });
          await authApi.logout();
          // Clear persisted tokens
          await AsyncStorage.removeItem('authToken');
          await AsyncStorage.removeItem('refreshToken');
          set({
            token: null,
            refreshToken: null,
            user: null,
            isLoading: false,
          });
        } catch (error) {
          console.error('Logout error:', error);
          // Clear local state even if API call fails
          await AsyncStorage.removeItem('authToken');
          await AsyncStorage.removeItem('refreshToken');
          set({
            token: null,
            refreshToken: null,
            user: null,
            isLoading: false,
            error: 'Failed to logout',
          });
        }
      },

      // Login with phone number
      login: async (phoneNumber: string) => {
        set({ isLoading: true, error: null });
        try {
          await authApi.login(phoneNumber);
          set({ isLoading: false });
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Login failed',
          });
          throw error;
        }
      },

      // Verify OTP
      verifyOtp: async (phoneNumber: string, otp: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.verifyOtp(phoneNumber, otp);
          // Persist tokens securely
          try {
            await AsyncStorage.setItem('authToken', response.token);
            await AsyncStorage.setItem('refreshToken', response.refreshToken);
          } catch (e) {
            console.warn('Failed to persist tokens locally');
          }

          set({
            token: response.token,
            refreshToken: response.refreshToken,
            user: response.user,
            isLoading: false,
          });
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'OTP verification failed',
          });
          throw error;
        }
      },

      // Restore token from storage (for app startup)
      restoreToken: async () => {
        try {
          const storedToken = await AsyncStorage.getItem('authToken');
          const storedRefresh = await AsyncStorage.getItem('refreshToken');
          if (storedToken) {
            set({ token: storedToken, refreshToken: storedRefresh });
          }
        } catch (error) {
          console.error('Error restoring token:', error);
        }
      },
    }),
    {
      name: 'auth-store', // Name in AsyncStorage
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        token: state.token,
        refreshToken: state.refreshToken,
        user: state.user,
      }),
    }
  )
);

export default useAuthStore;
