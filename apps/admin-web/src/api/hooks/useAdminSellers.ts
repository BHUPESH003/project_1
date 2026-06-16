import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPatch, apiPost } from '@/api/client'
import { qk, PAGE_SIZE } from '@/lib/constants'
import { useAuthStore } from '@/stores/authStore'
import type {
  AdminSeller,
  AdminSellerDetail,
  Product,
  UpdateAdminSellerInput,
} from '@/types/api'

export interface SellerFilters {
  status?: string
  category?: string
  isVerified?: boolean
  isSuspended?: boolean
  search?: string
  page?: number
  limit?: number
}

export interface AdminSellerList {
  sellers: AdminSeller[]
  total: number
  page: number
  limit: number
  totalPages: number
}

/**
 * GET /admin/sellers — camelCase `{ sellers, total }`. The backend has no
 * page echo or total_pages, so we derive pagination here. `search` is applied
 * client-side over the returned page (no server search param exists).
 */
export function useAdminSellers(filters: SellerFilters) {
  const isAuthed = useAuthStore((s) => s.isAuthenticated)
  const limit = filters.limit ?? PAGE_SIZE
  const page = filters.page ?? 1
  return useQuery<AdminSellerList>({
    queryKey: qk.sellers(filters),
    queryFn: async () => {
      const params: Record<string, unknown> = { page, limit }
      if (filters.status) params.status = filters.status
      if (filters.category) params.category = filters.category
      if (filters.isVerified != null) params.isVerified = filters.isVerified
      if (filters.isSuspended != null) params.isSuspended = filters.isSuspended
      const res = await apiGet<{ sellers: AdminSeller[]; total: number }>(
        '/admin/sellers',
        { params },
      )
      let sellers = res.sellers
      if (filters.search) {
        const q = filters.search.toLowerCase()
        sellers = sellers.filter(
          (s) =>
            s.shopName.toLowerCase().includes(q) ||
            (s.user?.phone ?? '').toLowerCase().includes(q),
        )
      }
      return {
        sellers,
        total: res.total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(res.total / limit)),
      }
    },
    enabled: isAuthed,
    staleTime: 15_000,
  })
}

export function useAdminSeller(id: string | undefined) {
  const isAuthed = useAuthStore((s) => s.isAuthenticated)
  return useQuery({
    queryKey: qk.seller(id ?? ''),
    queryFn: () => apiGet<AdminSellerDetail>(`/admin/sellers/${id}`),
    enabled: isAuthed && !!id,
  })
}

/** GET /sellers/:id/products — public read-only catalogue. */
export function useSellerProducts(id: string | undefined) {
  const isAuthed = useAuthStore((s) => s.isAuthenticated)
  return useQuery({
    queryKey: qk.sellerProducts(id ?? ''),
    queryFn: async () => {
      const res = await apiGet<{ items?: Product[] } | Product[]>(
        `/sellers/${id}/products`,
      )
      return Array.isArray(res) ? res : (res.items ?? [])
    },
    enabled: isAuthed && !!id,
  })
}

/* ── Mutations ─────────────────────────────────────────────────────────── */

function useSellerMutation<TVars>(fn: (id: string, vars: TVars) => Promise<unknown>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, vars }: { id: string; vars: TVars }) => fn(id, vars),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: qk.seller(id) })
      qc.invalidateQueries({ queryKey: ['admin-sellers'] })
    },
  })
}

export function useVerifySeller() {
  return useSellerMutation<void>((id) => apiPost(`/admin/sellers/${id}/verify`))
}
export function useUnverifySeller() {
  return useSellerMutation<void>((id) => apiPost(`/admin/sellers/${id}/unverify`))
}
export function useSuspendSeller() {
  return useSellerMutation<void>((id) => apiPost(`/admin/sellers/${id}/suspend`))
}
export function useUnsuspendSeller() {
  return useSellerMutation<void>((id) => apiPost(`/admin/sellers/${id}/unsuspend`))
}
export function useUpdateSeller() {
  return useSellerMutation<UpdateAdminSellerInput>((id, vars) =>
    apiPatch(`/admin/sellers/${id}`, vars),
  )
}
