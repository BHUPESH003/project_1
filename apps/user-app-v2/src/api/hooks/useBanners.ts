import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { Banner } from '@/api/types';

export function useBanners() {
  return useQuery({
    queryKey: ['banners', 'active'],
    queryFn: () =>
      apiClient.get<Banner[]>('/banners/active').then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });
}
