import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { apiGet } from '@/api/client'
import { qk } from '@/lib/constants'
import type { Seller, SellersQuery, Product, UnverifiedSeller } from '@/api/types'

const PAGE_SIZE = 10

/**
 * The list endpoints (/sellers, /sellers/trending, /sellers/new) return
 * snake_case fields (seller_id, shop_name, image_url, distance_km, …), unlike
 * /sellers/:id which is camelCase. Map each row to the camelCase Seller shape
 * so `seller.id` is defined — otherwise SellerCard links to /sellers/undefined.
 * Tolerant of both shapes so it survives a future backend cleanup.
 */
function mapSeller(raw: Record<string, unknown>): Seller {
  return {
    ...raw,
    id: raw.id ?? raw.seller_id,
    shopName: raw.shopName ?? raw.shop_name,
    imageUrl: raw.imageUrl ?? raw.image_url ?? null,
    imagePath: raw.imagePath ?? null,
    prepTimeMinutes: raw.prepTimeMinutes ?? raw.prep_time_min ?? null,
    estimatedDeliveryTimeMins:
      raw.estimatedDeliveryTimeMins ?? raw.estimated_delivery_time_mins ?? undefined,
    distanceKm: raw.distanceKm ?? raw.distance_km,
    pricePerPage: raw.pricePerPage ?? (raw.price_breakdown as Record<string, unknown> | undefined)?.per_page ?? null,
    isFavorite: raw.isFavorite ?? raw.is_favorited,
  } as Seller
}

/** The API may return a bare array or `{ sellers, total }`; normalise both. */
function normalizeSellers(res: unknown): Seller[] {
  let rows: Record<string, unknown>[] = []
  if (Array.isArray(res)) rows = res as Record<string, unknown>[]
  else if (res && typeof res === 'object' && 'sellers' in res)
    rows = ((res as { sellers?: Record<string, unknown>[] }).sellers) ?? []
  else if (res && typeof res === 'object' && 'items' in res)
    rows = ((res as { items?: Record<string, unknown>[] }).items) ?? []
  return rows.map(mapSeller)
}

/**
 * GET /sellers — paginated, location-gated, infinite scroll.
 *
 * Sorting and filtering are backend-supported: `sort` (nearest|rating|newest),
 * `hasOffers` and `minRating` are sent to the API so they apply across all
 * pages, not just the loaded ones. `hasOffers` is sent only when true so the
 * default request stays clean.
 */
export function useAvailableSellers(params: Omit<SellersQuery, 'limit' | 'offset'>) {
  const { category, lat, lng, maxDistanceKm, sort, hasOffers, minRating } = params
  return useInfiniteQuery({
    queryKey: qk.sellers({ category, lat, lng, maxDistanceKm, sort, hasOffers, minRating }),
    queryFn: async ({ pageParam = 0 }) => {
      const res = await apiGet<unknown>('/sellers', {
        params: {
          category,
          lat,
          lng,
          maxDistanceKm,
          sort,
          hasOffers: hasOffers || undefined,
          minRating,
          limit: PAGE_SIZE,
          offset: pageParam,
        },
      })
      return normalizeSellers(res)
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length < PAGE_SIZE ? undefined : allPages.length * PAGE_SIZE,
    enabled: params.lat != null && params.lng != null,
    staleTime: 30_000,
  })
}

/** GET /sellers/trending */
export function useTrendingSellers(lat?: number, lng?: number) {
  return useQuery({
    queryKey: [...qk.trending, lat, lng],
    queryFn: async () => normalizeSellers(await apiGet<unknown>('/sellers/trending', { params: { lat, lng } })),
    staleTime: 60_000,
  })
}

/** GET /sellers/new */
export function useNewSellers(lat?: number, lng?: number) {
  return useQuery({
    queryKey: [...qk.newSellers, lat, lng],
    queryFn: async () => normalizeSellers(await apiGet<unknown>('/sellers/new', { params: { lat, lng } })),
    staleTime: 60_000,
  })
}

/** GET /discovery/sellers — returns nearby unverified (Google Places) sellers not yet on the platform. */
export function useDiscoverySellers(lat?: number, lng?: number, category?: string) {
  return useQuery({
    queryKey: ['discovery', lat, lng, category],
    queryFn: async () => {
      const res = await apiGet<{ sellers: (Seller | UnverifiedSeller)[] }>('/discovery/sellers', {
        params: { lat, lng, category, limit: 10 },
      })
      return (res.sellers ?? []).filter((s): s is UnverifiedSeller => (s as UnverifiedSeller).source === 'google_places')
    },
    enabled: lat != null && lng != null,
    staleTime: 5 * 60_000,
  })
}

/** GET /sellers/:id?lat&lng */
export function useSeller(id: string | undefined, lat?: number, lng?: number) {
  return useQuery({
    queryKey: qk.seller(id ?? '', { lat, lng }),
    queryFn: () => apiGet<Seller>(`/sellers/${id}`, { params: { lat, lng } }),
    enabled: !!id,
    staleTime: 30_000,
  })
}

/** GET /sellers/:sellerId/products/:productId — full product detail with metadata */
export function useProduct(sellerId: string | undefined, productId: string | undefined) {
  return useQuery({
    queryKey: ['sellers', sellerId, 'products', productId],
    queryFn: () => apiGet<Product>(`/sellers/${sellerId}/products/${productId}`),
    enabled: !!sellerId && !!productId,
    staleTime: 30_000,
  })
}

/** GET /sellers/:id/products?filter */
export function useSellerProducts(id: string | undefined, filter?: string) {
  return useQuery({
    queryKey: qk.sellerProducts(id ?? '', { filter }),
    queryFn: async () => {
      const res = await apiGet<unknown>(`/sellers/${id}/products`, { params: { filter, limit: 100 } })
      if (Array.isArray(res)) return res as Product[]
      if (res && typeof res === 'object' && 'items' in res) return (res as { items: Product[] }).items ?? []
      if (res && typeof res === 'object' && 'products' in res) return (res as { products: Product[] }).products ?? []
      return [] as Product[]
    },
    enabled: !!id,
    staleTime: 30_000,
  })
}
