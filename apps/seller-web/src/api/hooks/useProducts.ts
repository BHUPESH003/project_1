import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiDelete, apiGet, apiPatch, apiPost } from '@/api/client'
import { qk } from '@/lib/constants'
import { useAuthStore } from '@/stores/authStore'
import type { ProductInput, ProductListResponse } from '@/types/api'

/** GET /sellers/me/products — the seller's own catalog. */
export function useProducts(search?: string) {
  const isAuthed = useAuthStore((s) => s.isAuthenticated)
  return useQuery({
    queryKey: qk.products(search),
    queryFn: () =>
      apiGet<ProductListResponse>('/sellers/me/products', {
        params: { limit: 100, ...(search ? { search } : {}) },
      }),
    enabled: isAuthed,
    staleTime: 10_000,
  })
}

function useProductsInvalidate() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: ['products'] })
}

/** POST /sellers/me/products */
export function useCreateProduct() {
  const invalidate = useProductsInvalidate()
  return useMutation({
    mutationFn: (input: ProductInput) =>
      apiPost<{ success: boolean; productId: string }>('/sellers/me/products', input),
    onSuccess: invalidate,
  })
}

/** PATCH /sellers/me/products/:id */
export function useUpdateProduct() {
  const invalidate = useProductsInvalidate()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<ProductInput> }) =>
      apiPatch<{ success: boolean }>(`/sellers/me/products/${id}`, input),
    onSuccess: invalidate,
  })
}

/** DELETE /sellers/me/products/:id — marks out of stock (soft remove). */
export function useDeleteProduct() {
  const invalidate = useProductsInvalidate()
  return useMutation({
    mutationFn: (id: string) => apiDelete<{ success: boolean }>(`/sellers/me/products/${id}`),
    onSuccess: invalidate,
  })
}
