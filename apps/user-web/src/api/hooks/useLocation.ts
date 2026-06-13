import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/api/client'
import { qk } from '@/lib/constants'
import type { ReverseGeocodeResult, AutocompleteResult } from '@/api/types'

/** GET /location/address?lat&lng — reverse geocode. */
export function useReverseGeocode(lat?: number, lng?: number) {
  return useQuery({
    queryKey: ['geocode', lat, lng],
    queryFn: () => apiGet<ReverseGeocodeResult>('/location/address', { params: { lat, lng } }),
    enabled: lat != null && lng != null,
    staleTime: 5 * 60_000,
  })
}

/** GET /location/autocomplete?query — place predictions. */
export function useAutocomplete(query: string) {
  return useQuery({
    queryKey: qk.autocomplete(query),
    queryFn: () => apiGet<AutocompleteResult[]>('/location/autocomplete', { params: { query } }),
    enabled: query.trim().length >= 3,
    staleTime: 60_000,
  })
}

/**
 * GET /location/place-details?placeId — resolve a prediction's coordinates.
 * Google autocomplete predictions carry no geometry, so call this on selection
 * when a prediction has no lat/lng. Returns null if it can't be resolved.
 */
export function fetchPlaceDetails(placeId: string) {
  return apiGet<{ latitude: number; longitude: number; address: string } | null>(
    '/location/place-details',
    { params: { placeId } },
  )
}
