/**
 * User Zustand Store
 * Manages user profile and preferences
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface UserProfile {
  id: string;
  phoneNumber: string;
  name: string;
  email?: string;
  avatar?: string;
  createdAt: string;
}

interface UserState {
  // State
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setProfile: (profile: UserProfile) => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  clearError: () => void;
  reset: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      // Initial state
      profile: null,
      isLoading: false,
      error: null,

      // Setters
      setProfile: (profile: UserProfile) => {
        set({ profile, error: null });
      },

      updateProfile: (updates: Partial<UserProfile>) => {
        set((state) => ({
          profile: state.profile ? { ...state.profile, ...updates } : null,
        }));
      },

      clearError: () => {
        set({ error: null });
      },

      reset: () => {
        set({
          profile: null,
          isLoading: false,
          error: null,
        });
      },
    }),
    {
      name: 'user-store', // Name in AsyncStorage
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        profile: state.profile,
      }),
    }
  )
);

export default useUserStore;
