import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const MAX_RECENT = 8

interface SearchState {
  // ── persisted ──────────────────────────────────────────────────────────────
  recentSearches: string[]
  addSearch: (q: string) => void
  removeSearch: (q: string) => void
  clearSearches: () => void
  // ── ephemeral (not persisted) ───────────────────────────────────────────────
  isSearchOpen: boolean
  openSearch: () => void
  closeSearch: () => void
}

export const useSearchStore = create<SearchState>()(
  persist(
    (set) => ({
      recentSearches: [],
      addSearch: (q) => {
        const trimmed = q.trim()
        if (!trimmed) return
        set((s) => ({
          recentSearches: [trimmed, ...s.recentSearches.filter((r) => r !== trimmed)].slice(
            0,
            MAX_RECENT,
          ),
        }))
      },
      removeSearch: (q) =>
        set((s) => ({ recentSearches: s.recentSearches.filter((r) => r !== q) })),
      clearSearches: () => set({ recentSearches: [] }),

      isSearchOpen: false,
      openSearch: () => set({ isSearchOpen: true }),
      closeSearch: () => set({ isSearchOpen: false }),
    }),
    {
      name: 'search-history',
      // Only save recentSearches to localStorage — open state is always false on boot
      partialize: (state) => ({ recentSearches: state.recentSearches }),
    },
  ),
)
