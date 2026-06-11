import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User } from '@/api/types';

const ACCESS_TOKEN_KEY  = '@auth/access_token';
const REFRESH_TOKEN_KEY = '@auth/refresh_token';
const USER_KEY          = '@auth/user';

interface AuthState {
  token:           string | null;
  refreshToken:    string | null;
  user:            User | null;
  isAuthenticated: boolean;
  sessionExpired:  boolean;

  login:  (payload: { accessToken: string; refreshToken: string; user: User }) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
  markSessionExpired: () => void;
  updateUser: (user: User) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token:           null,
  refreshToken:    null,
  user:            null,
  isAuthenticated: false,
  sessionExpired:  false,

  async login({ accessToken, refreshToken, user }) {
    await Promise.all([
      AsyncStorage.setItem(ACCESS_TOKEN_KEY, accessToken),
      AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken),
      AsyncStorage.setItem(USER_KEY, JSON.stringify(user)),
    ]);
    set({
      token: accessToken,
      refreshToken,
      user,
      isAuthenticated: true,
      sessionExpired: false,
    });
  },

  async logout() {
    await Promise.all([
      AsyncStorage.removeItem(ACCESS_TOKEN_KEY),
      AsyncStorage.removeItem(REFRESH_TOKEN_KEY),
      AsyncStorage.removeItem(USER_KEY),
    ]);
    set({ token: null, refreshToken: null, user: null, isAuthenticated: false, sessionExpired: false });
  },

  async restoreSession() {
    try {
      const [token, refresh, userJson] = await Promise.all([
        AsyncStorage.getItem(ACCESS_TOKEN_KEY),
        AsyncStorage.getItem(REFRESH_TOKEN_KEY),
        AsyncStorage.getItem(USER_KEY),
      ]);
      if (token && userJson) {
        set({
          token,
          refreshToken: refresh,
          user: JSON.parse(userJson),
          isAuthenticated: true,
        });
      }
    } catch {
      // Corrupt storage – silently ignore
    }
  },

  markSessionExpired() {
    set({ sessionExpired: true, isAuthenticated: false });
  },

  async updateUser(user: User) {
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
    set({ user });
  },
}));
