import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthUser } from '@/types/api'

interface LoginPayload {
  accessToken: string
  refreshToken: string
  user: AuthUser
}

interface AuthState {
  token: string | null
  refreshToken: string | null
  user: AuthUser | null
  isAuthenticated: boolean
  setToken: (token: string) => void
  setUser: (user: AuthUser) => void
  login: (payload: LoginPayload) => void
  logout: () => void
}

/**
 * Auth state for the seller console. Server data (the seller profile, orders,
 * products) lives in the React Query cache — NOT here. We only persist the
 * tokens + the minimal authed user identity.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      setToken: (token) => set({ token }),
      setUser: (user) => set({ user }),
      login: ({ accessToken, refreshToken, user }) =>
        set({ token: accessToken, refreshToken, user, isAuthenticated: true }),
      logout: () =>
        set({ token: null, refreshToken: null, user: null, isAuthenticated: false }),
    }),
    { name: 'seller-auth-storage' },
  ),
)
