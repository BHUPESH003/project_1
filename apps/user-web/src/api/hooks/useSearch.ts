import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/api/client'
import { qk } from '@/lib/constants'
import type { SearchResults, Seller } from '@/api/types'

/**
 * The /search endpoint returns `{ sellers, products }` in camelCase (aligned
 * with the rest of the API). Older builds returned `shops` with snake_case
 * fields (seller_id, shop_name, image_url, product_id), so this stays tolerant
 * of both shapes — otherwise `p.sellerId` is undefined and clicking a product
 * result navigates to /sellers/undefined (404).
 */
function normalizeSearch(res: unknown): SearchResults {
  if (!res || typeof res !== 'object') return { sellers: [], products: [] }
  const r = res as { shops?: Record<string, unknown>[]; sellers?: Record<string, unknown>[]; products?: Record<string, unknown>[] }
  const rawSellers: Record<string, unknown>[] = r.sellers ?? r.shops ?? []
  const sellers = rawSellers.map((s) => ({
    id: s.id ?? s.seller_id ?? '',
    shopName: s.shopName ?? s.shop_name ?? '',
    address: s.address ?? '',
    status: s.status,
    rating: s.rating ?? null,
    imageUrl: s.imageUrl ?? s.image_url ?? null,
    categories: (s.categories as { id: string; name: string }[] | undefined)?.map((c) => ({ id: c.id, name: c.name })),
  })) as unknown as Seller[]
  const rawProducts: Record<string, unknown>[] = r.products ?? []
  const products = rawProducts.map((p) => {
    const sellerId = (p.sellerId ?? p.seller_id ?? '') as string
    const shopName = (p.shopName ?? p.shop_name ?? '') as string
    return {
      id: (p.id ?? p.product_id ?? '') as string,
      sellerId,
      name: (p.name ?? '') as string,
      description: (p.description ?? null) as string | null,
      category: (p.category ?? '') as string,
      price: (p.price ?? 0) as number,
      image: (p.image ?? null) as string | null,
      seller: sellerId ? { id: sellerId, shopName } : undefined,
    }
  }) as unknown as SearchResults['products']
  return { sellers, products }
}

/** GET /search?q=…&limit=20 — global search across shops + products. */
export function useSearch(query: string) {
  const q = query.trim()
  return useQuery({
    queryKey: qk.search(q),
    queryFn: async () => normalizeSearch(await apiGet<unknown>('/search', { params: { q, limit: 20 } })),
    enabled: q.length >= 2,
    staleTime: 30_000,
  })
}
