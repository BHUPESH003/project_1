import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ThemePref = 'light' | 'dark' | 'system'

function systemPrefersDark() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-color-scheme: dark)').matches
  )
}

/** Resolve a preference to the concrete theme that should be applied. */
export function resolveTheme(pref: ThemePref): 'light' | 'dark' {
  if (pref === 'system') return systemPrefersDark() ? 'dark' : 'light'
  return pref
}

/** Write the theme onto <html data-theme="…"> so CSS variables flip. */
export function applyTheme(pref: ThemePref) {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('data-theme', resolveTheme(pref))
}

interface ThemeState {
  pref: ThemePref
  setPref: (pref: ThemePref) => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      pref: 'system',
      setPref: (pref) => {
        applyTheme(pref)
        set({ pref })
      },
    }),
    {
      name: 'theme-storage',
      onRehydrateStorage: () => (state) => {
        applyTheme(state?.pref ?? 'system')
      },
    },
  ),
)
