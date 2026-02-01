/**
 * Auth store – token and user state.
 * Tokens persisted via tokenStorage (SecureStore + AsyncStorage).
 * No backend logout endpoint; 401 clears session and sets sessionExpired.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi } from '@/api/auth.api';
import { tokenStorage } from '@/lib/token-storage';

export interface AuthUser {
  id: string;
  phone: string;
  role: string;
  name?: string;
}

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  isLoading: boolean;
  error: string | null;
  /** Set by client on 401 after refresh failure – redirect to session-expired. */
  sessionExpired: boolean;

  setToken: (token: string, refreshToken: string) => void;
  setUser: (user: AuthUser) => void;
  clearError: () => void;
  /** Clear in-memory auth state and sessionExpired flag. Call after tokenStorage.clear(). */
  clearSession: () => void;
  resetSessionExpired: () => void;
  /** Local logout: clear tokens and state (no backend logout endpoint). */
  logout: () => Promise<void>;

  requestOtp: (phone: string) => Promise<void>;
  verifyOtp: (phone: string, otp: string) => Promise<void>;
  restoreToken: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      refreshToken: null,
      user: null,
      isLoading: false,
      error: null,
      sessionExpired: false,

      setToken: (token: string, refreshToken: string) => {
        tokenStorage.setToken(token).catch(() => {});
        tokenStorage.setRefreshToken(refreshToken).catch(() => {});
        set({ token, refreshToken, error: null, sessionExpired: false });
      },

      setUser: (user: AuthUser) => set({ user }),

      clearError: () => set({ error: null }),

      clearSession: () =>
        set({
          token: null,
          refreshToken: null,
          user: null,
          error: null,
          sessionExpired: true,
        }),

      resetSessionExpired: () => set({ sessionExpired: false }),

      logout: async () => {
        await tokenStorage.clear();
        set({
          token: null,
          refreshToken: null,
          user: null,
          error: null,
          sessionExpired: false,
        });
      },

      requestOtp: async (phone: string) => {
        set({ isLoading: true, error: null });
        try {
          await authApi.requestOtp(phone, 'USER');
          set({ isLoading: false });
        } catch (err: unknown) {
          const message =
            err && typeof err === 'object' && 'response' in err
              ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
              : err instanceof Error
                ? err.message
                : 'Request failed';
          set({ isLoading: false, error: message ?? 'Failed to send OTP' });
          throw err;
        }
      },

      verifyOtp: async (phone: string, otp: string) => {
        set({ isLoading: true, error: null });
        try {
          const res = await authApi.verifyOtp(phone, otp);
          await tokenStorage.setToken(res.accessToken, res.accessTokenExpiresIn);
          await tokenStorage.setRefreshToken(res.refreshToken);
          set({
            token: res.accessToken,
            refreshToken: res.refreshToken,
            user: {
              id: res.user.id,
              phone: res.user.phone,
              role: res.user.role,
            },
            isLoading: false,
            error: null,
            sessionExpired: false,
          });
        } catch (err: unknown) {
          const message =
            err && typeof err === 'object' && 'response' in err
              ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
              : err instanceof Error
                ? err.message
                : 'Verification failed';
          set({ isLoading: false, error: message ?? 'Invalid or expired OTP' });
          throw err;
        }
      },

      restoreToken: async () => {
        try {
          const token = await tokenStorage.getToken();
          const refreshToken = await tokenStorage.getRefreshToken();
          if (token) {
            set({ token, refreshToken });
          }
        } catch {
          // ignore
        }
      },
    }),
    {
      name: 'auth-store',
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
