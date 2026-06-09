import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ThemeMode } from '@/theme';

const ONBOARDING_KEY = '@app/onboarding_seen';

interface AppState {
  onboardingSeen: boolean;
  markOnboardingSeen: () => Promise<void>;
  restoreAppState: () => Promise<void>;
}

export const useAppStore = create<AppState>((set) => ({
  onboardingSeen: false,

  async markOnboardingSeen() {
    await AsyncStorage.setItem(ONBOARDING_KEY, '1');
    set({ onboardingSeen: true });
  },

  async restoreAppState() {
    const seen = await AsyncStorage.getItem(ONBOARDING_KEY);
    set({ onboardingSeen: !!seen });
  },
}));
