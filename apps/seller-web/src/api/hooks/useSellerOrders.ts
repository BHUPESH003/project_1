import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { OrderStatus } from '@repo/types'
import { apiGet, apiPost } from '@/api/client'
import { qk } from '@/lib/constants'
import { useAuthStore } from '@/stores/authStore'
import type { SellerOrderDetail, SellerOrderSummary } from '@/types/api'

/**
 * GET /orders/seller/orders?status= — the seller's orders, optionally filtered.
 * `pollMs` enables polling (e.g. 5s for the PAID/new-order watch).
 */
export function useSellerOrders(
  status?: OrderStatus,
  options?: { pollMs?: number; enabled?: boolean },
) {
  const isAuthed = useAuthStore((s) => s.isAuthenticated)
  return useQuery({
    queryKey: qk.sellerOrders(status),
    queryFn: () =>
      apiGet<SellerOrderSummary[]>('/orders/seller/orders', {
        params: status ? { status } : undefined,
      }),
    enabled: (options?.enabled ?? true) && isAuthed,
    refetchInterval: options?.pollMs,
    staleTime: 2000,
  })
}

/** GET /orders/:id — full order detail (items, files, drop, history). */
export function useOrderDetail(id: string | undefined) {
  return useQuery({
    queryKey: qk.order(id ?? ''),
    queryFn: () => apiGet<SellerOrderDetail>(`/orders/${id}`),
    enabled: !!id,
    staleTime: 2000,
  })
}

function useOrderActionInvalidate() {
  const qc = useQueryClient()
  return (id: string) => {
    void qc.invalidateQueries({ queryKey: ['seller-orders'] })
    void qc.invalidateQueries({ queryKey: qk.order(id) })
  }
}

/** POST /orders/seller/orders/:id/accept — PAID → SELLER_ACCEPTED → PREPARING. */
export function useAcceptOrder() {
  const invalidate = useOrderActionInvalidate()
  return useMutation({
    mutationFn: (id: string) =>
      apiPost<{ order_id: string; status: OrderStatus }>(
        `/orders/seller/orders/${id}/accept`,
      ),
    onSuccess: (_d, id) => invalidate(id),
  })
}

/** POST /orders/seller/orders/:id/reject — PAID → SELLER_REJECTED. */
export function useRejectOrder() {
  const invalidate = useOrderActionInvalidate()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      apiPost<{ order_id: string; status: OrderStatus }>(
        `/orders/seller/orders/${id}/reject`,
        reason ? { reason } : {},
      ),
    onSuccess: (_d, vars) => invalidate(vars.id),
  })
}

/** POST /orders/seller/orders/:id/ready — PREPARING → READY_FOR_PICKUP. */
export function useMarkReady() {
  const invalidate = useOrderActionInvalidate()
  return useMutation({
    mutationFn: (id: string) =>
      apiPost<{ order_id: string; status: OrderStatus }>(
        `/orders/seller/orders/${id}/ready`,
      ),
    onSuccess: (_d, id) => invalidate(id),
  })
}
