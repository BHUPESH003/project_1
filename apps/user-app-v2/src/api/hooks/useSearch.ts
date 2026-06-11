import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { mapSearchResult } from '@/api/mappers';
import type { SearchResult, AutocompleteResult } from '@/api/types';

export function useSearch(query: string, lat?: number, lng?: number) {
  return useQuery({
    queryKey: ['search', query, lat, lng],
    queryFn: () => {
      const params: Record<string, string | number> = { q: query };
      if (lat !== undefined) params.lat = lat;
      if (lng !== undefined) params.lng = lng;
      return apiClient
        .get<any>('/search', { params })
        .then((r) => mapSearchResult(r.data ?? {}));
    },
    enabled: query.trim().length >= 2,
  });
}

export function useAutocomplete(query: string) {
  return useQuery({
    queryKey: ['autocomplete', query],
    queryFn: () =>
      apiClient
        .get<AutocompleteResult[]>('/location/autocomplete', {
          params: { query },
        })
        .then((r) => (Array.isArray(r.data) ? r.data : [])),
    enabled: query.trim().length >= 2,
    staleTime: 30_000,
  });
}
