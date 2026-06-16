import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { SellerStatus } from '@repo/types'
import { apiGet, apiPatch, apiPost } from '@/api/client'
import { qk } from '@/lib/constants'
import { useAuthStore } from '@/stores/authStore'
import type {
  RegisterSellerInput,
  SellerProfile,
  UpdateSellerInput,
} from '@/types/api'

/**
 * GET /sellers/me — the authenticated seller's profile (incl. isVerified,
 * isSuspended, status, stats). Resolves to `null` (a normal 200 response) when
 * the user hasn't registered a shop yet; callers treat null as "needs
 * registration" rather than handling it as a request failure.
 */
export function useSellerProfile(options?: { pollMs?: number; enabled?: boolean }) {
  const isAuthed = useAuthStore((s) => s.isAuthenticated)
  return useQuery({
    queryKey: qk.sellerProfile,
    queryFn: () => apiGet<SellerProfile | null>('/sellers/me'),
    enabled: (options?.enabled ?? true) && isAuthed,
    refetchInterval: options?.pollMs,
    retry: false,
    staleTime: 10_000,
  })
}

/** POST /sellers/register — create the seller profile for the current user. */
export function useRegisterSeller() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: RegisterSellerInput) =>
      apiPost<SellerProfile>('/sellers/register', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.sellerProfile }),
  })
}

/** PATCH /sellers/me — partial profile update. */
export function useUpdateSeller() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateSellerInput) =>
      apiPatch<SellerProfile>('/sellers/me', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.sellerProfile }),
  })
}

/** POST /sellers/status — toggle ONLINE/OFFLINE availability. */
export function useSetStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (status: SellerStatus) =>
      apiPost<{ id: string; status: SellerStatus }>('/sellers/status', { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.sellerProfile }),
  })
}
