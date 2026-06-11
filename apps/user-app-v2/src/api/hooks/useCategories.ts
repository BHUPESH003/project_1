import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { mapCategory } from '@/api/mappers';
import type { Category } from '@/api/types';

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () =>
      apiClient
        .get<any[]>('/categories')
        .then((r) => (Array.isArray(r.data) ? r.data.map(mapCategory) : [])),
    staleTime: 5 * 60 * 1000,
  });
}
