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
    login,
    verifyOtp,
    restoreToken,
  } = useAuthStore();

  const isAuthenticated = !!token && !!user;

  return {
    // State
    token,
    refreshToken,
    user,
    isLoading,
    error,
    isAuthenticated,

    // Actions
    setToken,
    setUser,
    logout,
    clearError,
    login,
    verifyOtp,
    restoreToken,
  };
};

export default useAuth;
