import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/api/client'
import { qk } from '@/lib/constants'
import type { AutocompleteResult, Category } from '@/types/api'

/** GET /categories — all categories (public). */
export function useCategories() {
  return useQuery({
    queryKey: qk.categories,
    queryFn: () => apiGet<Category[]>('/categories'),
    staleTime: 5 * 60_000,
  })
}

/** GET /location/autocomplete?query= — place predictions. */
export function useAutocomplete(query: string) {
  return useQuery({
    queryKey: qk.autocomplete(query),
    queryFn: () =>
      apiGet<AutocompleteResult[]>('/location/autocomplete', { params: { query } }),
    enabled: query.trim().length >= 3,
    staleTime: 60_000,
  })
}

/** GET /location/place-details?placeId= — resolve a prediction's coordinates. */
export function fetchPlaceDetails(placeId: string) {
  return apiGet<{ latitude: number; longitude: number; address: string } | null>(
    '/location/place-details',
    { params: { placeId } },
  )
}
