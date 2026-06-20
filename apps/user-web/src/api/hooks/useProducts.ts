import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/api/client'
import { qk } from '@/lib/constants'
import type { BrowseProduct } from '@/api/types'

interface BrowseParams {
  categoryId?: string
  subCategory?: string
}

/** GET /products/browse — all in-stock products sorted newest, optionally filtered */
export function useProductBrowse(params: BrowseParams) {
  return useQuery({
    queryKey: qk.productBrowse(params),
    queryFn: () =>
      apiGet<BrowseProduct[]>('/products/browse', {
        params: {
          ...(params.categoryId ? { categoryId: params.categoryId } : {}),
          ...(params.subCategory ? { sub: params.subCategory } : {}),
        },
      }),
    enabled: !!(params.categoryId || params.subCategory),
    staleTime: 2 * 60_000,
  })
}
