import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost } from '@/api/client'
import { qk, PAGE_SIZE } from '@/lib/constants'
import { useAuthStore } from '@/stores/authStore'
import type { AdminPayout, PayoutStatus } from '@/types/api'

export interface PayoutFilters {
  status?: PayoutStatus
  page?: number
  limit?: number
}

export interface AdminPayoutList {
  data: AdminPayout[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}

/** GET /admin/payouts — withdrawal requests raised by sellers. */
export function usePayouts(filters: PayoutFilters) {
  const isAuthed = useAuthStore((s) => s.isAuthenticated)
  return useQuery<AdminPayoutList>({
    queryKey: qk.payouts(filters),
    queryFn: () =>
      apiGet<AdminPayoutList>('/admin/payouts', {
        params: {
          ...(filters.status ? { status: filters.status } : {}),
          page: filters.page ?? 1,
          limit: filters.limit ?? PAGE_SIZE,
        },
      }),
    enabled: isAuthed,
    staleTime: 15_000,
  })
}

export function useProcessPayout() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) =>
      apiPost(`/admin/payouts/${id}/process`, { note }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-payouts'] }),
  })
}

export function useRejectPayout() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      apiPost(`/admin/payouts/${id}/reject`, { reason }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-payouts'] }),
  })
}
