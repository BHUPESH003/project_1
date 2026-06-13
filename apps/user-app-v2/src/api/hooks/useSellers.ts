import {
  useInfiniteQuery,
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { mapSeller, mapSellerPage } from '@/api/mappers';
import type { Seller, PaginatedSellers, Product, ProductsByCategory } from '@/api/types';

export interface SellersParams {
  lat?: number;
  lng?: number;
  category?: string;
}

const PAGE_SIZE = 10;

export function useSellers(params: SellersParams = {}) {
  return useInfiniteQuery({
    queryKey: ['sellers', 'available', params],
    queryFn: async ({ pageParam }) => {
      const offset = (pageParam as number) * PAGE_SIZE;
      const p: Record<string, string | number> = { limit: PAGE_SIZE, offset };
      if (params.lat !== undefined) p.lat = params.lat;
      if (params.lng !== undefined) p.lng = params.lng;
      if (params.category) p.category = params.category;
      const res = await apiClient.get<any>('/sellers', { params: p });
      return mapSellerPage(res.data);
    },
    initialPageParam: 0,
    getNextPageParam: (last: PaginatedSellers, _all, pageParam) => {
      const currentOffset = (pageParam as number) * PAGE_SIZE;
      return currentOffset + PAGE_SIZE < last.total ? (pageParam as number) + 1 : undefined;
    },
  });
}

export function useSeller(id: string) {
  return useQuery({
    queryKey: ['seller', id],
    queryFn: () =>
      apiClient.get<any>(`/sellers/${id}`).then((r) => mapSeller(r.data)),
    enabled: Boolean(id),
  });
}

export function useSellerProducts(id: string) {
  return useQuery({
    queryKey: ['seller', id, 'products'],
    queryFn: async (): Promise<ProductsByCategory[]> => {
      const res = await apiClient.get<any>(`/sellers/${id}/products`);
      // Backend returns { items: [...], pagination: {...} }
      // Axios interceptor already unwraps the { code, data, message } envelope
      const raw = res.data;
      const items: any[] = raw?.items ?? (Array.isArray(raw) ? raw : []);

      // Group flat product list by the product's `category` string field
      const groupMap = new Map<string, Product[]>();
      for (const p of items) {
        const catKey: string = p.category ?? 'Other';
        if (!groupMap.has(catKey)) groupMap.set(catKey, []);
        groupMap.get(catKey)!.push({
          id: p.id,
          name: p.name,
          description: p.description,
          price: p.price,
          mrp: p.mrp ?? undefined,
          imageUrl: p.image ?? p.imageUrl ?? undefined,
          isPrinting: false, // resolved at screen level from seller.categories
          isBestSeller: p.isBestSeller ?? false,
          categoryId: catKey,
          categoryName: catKey,
          inStock: p.inStock ?? true,
        });
      }
      return Array.from(groupMap.entries()).map(([cat, products]) => ({
        categoryId: cat,
        categoryName: cat,
        products,
      }));
    },
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
      return apiClient.post(`/favorites/${sellerId}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sellers'] });
      qc.invalidateQueries({ queryKey: ['seller'] });
      qc.invalidateQueries({ queryKey: ['favorites'] });
    },
  });
}
