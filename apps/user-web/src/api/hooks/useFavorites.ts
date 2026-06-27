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
      const rows = Array.isArray(res)
        ? res
        : res && typeof res === 'object' && 'sellers' in res
          ? (res as { sellers: unknown[] }).sellers ?? []
          : []

      // Backend returns { sellerId, seller: { id, shopName, ... } }[].
      // Flatten to Seller[] so SellerCard gets the shape it expects.
      return rows.map((r: unknown) => {
        const row = r as Record<string, unknown>
        const nested = row.seller as Partial<Seller> | undefined
        // Already flat (future-proofing) or nested
        const base = nested ?? (row as Partial<Seller>)
        return { ...base, isFavorite: true } as Seller
      })
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

    onMutate: async ({ sellerId, isFavorite }) => {
      await qc.cancelQueries({ queryKey: qk.favorites })

      const prevFavs = qc.getQueryData<Seller[]>(qk.favorites)

      // Optimistically update the favorites list
      qc.setQueryData<Seller[]>(qk.favorites, (old = []) => {
        if (isFavorite) {
          // Removing from favourites
          return old.filter((s) => s.id !== sellerId)
        } else {
          // Adding — mark as favourite in the list if it's already there
          const exists = old.some((s) => s.id === sellerId)
          if (exists) return old.map((s) => (s.id === sellerId ? { ...s, isFavorite: true } : s))
          return old
        }
      })

      // Also flip isFavorite on any cached seller detail / seller list entries
      for (const key of qc.getQueryCache().getAll()) {
        const k = key.queryKey
        if (
          (Array.isArray(k) && (k[0] === 'sellers' || k[0] === 'seller')) ||
          (Array.isArray(k) && k.includes('seller') && k.includes(sellerId))
        ) {
          qc.setQueryData(k, (old: unknown) => {
            if (!old) return old
            if (Array.isArray(old)) {
              return (old as Seller[]).map((s) =>
                s.id === sellerId ? { ...s, isFavorite: !isFavorite } : s,
              )
            }
            const s = old as Seller
            if (s.id === sellerId) return { ...s, isFavorite: !isFavorite }
            return old
          })
        }
      }

      return { prevFavs }
    },

    onError: (_err, _vars, ctx) => {
      if (ctx?.prevFavs !== undefined) qc.setQueryData(qk.favorites, ctx.prevFavs)
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: qk.favorites })
      qc.invalidateQueries({ queryKey: ['sellers'] })
      qc.invalidateQueries({ queryKey: ['seller'] })
    },
  })
}
