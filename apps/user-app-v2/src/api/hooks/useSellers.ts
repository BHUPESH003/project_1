import {
  useInfiniteQuery,
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { Seller, PaginatedSellers, ProductsByCategory } from '@/api/types';

export type SellersSort = 'distance' | 'rating' | 'newest';

export interface SellersParams {
  lat?: number;
  lng?: number;
  sort?: SellersSort;
  categoryId?: string;
}

export function useSellers(params: SellersParams = {}) {
  return useInfiniteQuery({
    queryKey: ['sellers', 'available', params],
    queryFn: async ({ pageParam }) => {
      const p: Record<string, string | number> = {
        page: pageParam as number,
        pageSize: 10,
      };
      if (params.lat !== undefined) p.lat = params.lat;
      if (params.lng !== undefined) p.lng = params.lng;
      if (params.sort) p.sort = params.sort;
      if (params.categoryId) p.categoryId = params.categoryId;
      const res = await apiClient.get<PaginatedSellers>('/sellers/available', {
        params: p,
      });
      return res.data;
    },
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.hasNextPage ? last.page + 1 : undefined,
  });
}

export function useSeller(id: string) {
  return useQuery({
    queryKey: ['seller', id],
    queryFn: () =>
      apiClient.get<Seller>(`/sellers/${id}`).then((r) => r.data),
    enabled: Boolean(id),
  });
}

export function useSellerProducts(id: string) {
  return useQuery({
    queryKey: ['seller', id, 'products'],
    queryFn: () =>
      apiClient
        .get<ProductsByCategory[]>(`/sellers/${id}/products`)
        .then((r) => r.data),
    enabled: Boolean(id),
  });
}

export function useFavoriteToggle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      sellerId,
      currentlyFavorited,
    }: {
      sellerId: string;
      currentlyFavorited: boolean;
    }) => {
      if (currentlyFavorited) {
        return apiClient.delete(`/favorites/${sellerId}`);
      }
      return apiClient.post('/favorites', { sellerId });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sellers'] });
      qc.invalidateQueries({ queryKey: ['seller'] });
      qc.invalidateQueries({ queryKey: ['favorites'] });
    },
  });
}
