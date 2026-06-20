import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/api/client'
import { qk } from '@/lib/constants'
import type { Category, Banner, Subcategory } from '@/api/types'

/** GET /categories */
export function useCategories() {
  return useQuery({
    queryKey: qk.categories,
    queryFn: () => apiGet<Category[]>('/categories'),
    staleTime: 10 * 60_000,
  })
}

/** GET /categories/:id/subcategories — distinct product sub-categories for a seller category */
export function useSubcategories(categoryId: string | undefined) {
  return useQuery({
    queryKey: qk.subcategories(categoryId ?? ''),
    queryFn: () => apiGet<Subcategory[]>(`/categories/${categoryId}/subcategories`),
    enabled: !!categoryId,
    staleTime: 5 * 60_000,
  })
}

/** GET /banners */
export function useBanners() {
  return useQuery({
    queryKey: qk.banners,
    queryFn: () => apiGet<Banner[]>('/banners'),
    staleTime: 5 * 60_000,
  })
}
