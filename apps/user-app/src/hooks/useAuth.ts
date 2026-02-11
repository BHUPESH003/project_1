/**
 * useAuth Hook
 * Custom hook to use auth state and actions
 * Wraps useAuthStore for convenience
 */

import { useAuthStore } from '@/store/auth.store';

export const useAuth = () => {
  const {
    token,
    refreshToken,
    user,
    isLoading,
    error,
    setToken,
    setUser,
    logout,
    clearError,
    requestOtp,
    verifyOtp,
    restoreToken,
  } = useAuthStore();

  const isAuthenticated = !!token && !!user;

  return {
    token,
    refreshToken,
    user,
    isLoading,
    error,
    isAuthenticated,
    setToken,
    setUser,
    logout,
    clearError,
    requestOtp,
    verifyOtp,
    restoreToken,
  };
};

export default useAuth;
