import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiDelete, apiGet, apiPost } from '@/api/client'
import { qk } from '@/lib/constants'
import { useAuthStore } from '@/stores/authStore'
import type { Seller } from '@/api/types'

/** GET /favorites — the user's favourite shops. */
export function useFavorites() {
  const isAuthed = useAuthStore((s) => s.isAuthenticated)
  return useQuery({
    queryKey: qk.favorites,
    queryFn: async () => {
      const res = await apiGet<unknown>('/favorites')
      if (Array.isArray(res)) return res as Seller[]
      if (res && typeof res === 'object' && 'sellers' in res) return (res as { sellers: Seller[] }).sellers ?? []
      return [] as Seller[]
    },
    enabled: isAuthed,
    staleTime: 60_000,
  })
}

/** Optimistic favourite toggle (POST/DELETE /favorites/:sellerId). */
export function useToggleFavorite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ sellerId, isFavorite }: { sellerId: string; isFavorite: boolean }) =>
      isFavorite ? apiDelete(`/favorites/${sellerId}`) : apiPost(`/favorites/${sellerId}`),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: qk.favorites })
      qc.invalidateQueries({ queryKey: ['sellers'] })
      qc.invalidateQueries({ queryKey: ['seller'] })
    },
  })
}
