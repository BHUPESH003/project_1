import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SettingsState {
  /** Play an audible chime on new orders (persisted across sessions). */
  soundEnabled: boolean
  setSoundEnabled: (v: boolean) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      soundEnabled: true,
      setSoundEnabled: (soundEnabled) => set({ soundEnabled }),
    }),
    { name: 'seller-settings-storage' },
  ),
)
