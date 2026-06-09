import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { Category } from '@/api/types';

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () =>
      apiClient.get<Category[]>('/categories').then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });
}
