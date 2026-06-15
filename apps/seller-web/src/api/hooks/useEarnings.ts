import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost } from '@/api/client'
import { qk } from '@/lib/constants'
import { useAuthStore } from '@/stores/authStore'
import type {
  CreatePayoutInput,
  EarningsPeriod,
  EarningsSummary,
  PayoutRequest,
} from '@/types/api'

/** GET /sellers/me/earnings?period= */
export function useEarnings(period: EarningsPeriod) {
  const isAuthed = useAuthStore((s) => s.isAuthenticated)
  return useQuery({
    queryKey: qk.earnings(period),
    queryFn: () =>
      apiGet<EarningsSummary>('/sellers/me/earnings', { params: { period } }),
    enabled: isAuthed,
    staleTime: 30_000,
  })
}

/** GET /sellers/me/payouts — withdrawal history. */
export function usePayouts() {
  const isAuthed = useAuthStore((s) => s.isAuthenticated)
  return useQuery({
    queryKey: qk.payouts,
    queryFn: () => apiGet<PayoutRequest[]>('/sellers/me/payouts'),
    enabled: isAuthed,
    staleTime: 30_000,
  })
}

/** POST /sellers/me/payouts — request a withdrawal. */
export function useCreatePayout() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreatePayoutInput) =>
      apiPost<PayoutRequest>('/sellers/me/payouts', input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.payouts })
      void qc.invalidateQueries({ queryKey: ['earnings'] })
    },
  })
}
