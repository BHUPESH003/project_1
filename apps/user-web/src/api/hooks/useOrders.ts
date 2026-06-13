import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost } from '@/api/client'
import { qk, isActiveOrder } from '@/lib/constants'
import { useAuthStore } from '@/stores/authStore'
import type { Order } from '@/api/types'

/**
 * The orders API returns `{ order_id, status, items[], seller{id,shopName,address},
 * pricing:{itemCost,deliveryFee,totalAmount}, category, stateHistory[], delivery,
 * createdAt }`. Map it onto the camelCase Order shape the UI expects — otherwise
 * `order.id` is undefined and OrderCard crashes on `.slice()`. Tolerant of a
 * future flat/camelCase shape too.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapOrder(raw: any): Order {
  const pricing = raw?.pricing ?? {}
  return {
    ...raw,
    id: raw?.id ?? raw?.order_id,
    status: raw?.status,
    items: raw?.items ?? [],
    categoryId: raw?.categoryId ?? raw?.category?.id,
    itemCost: raw?.itemCost ?? pricing.itemCost ?? null,
    deliveryFee: raw?.deliveryFee ?? pricing.deliveryFee ?? null,
    totalAmount: raw?.totalAmount ?? pricing.totalAmount ?? null,
    dropAddress: raw?.dropAddress ?? raw?.drop_address ?? null,
    createdAt: raw?.createdAt ?? raw?.created_at,
    seller: raw?.seller ?? null,
    payment: raw?.payment ?? null,
    delivery: raw?.delivery ?? null,
    stateHistory: raw?.stateHistory ?? raw?.state_history ?? [],
  } as Order
}

function normalizeOrders(res: unknown): Order[] {
  let rows: unknown[] = []
  if (Array.isArray(res)) rows = res
  else if (res && typeof res === 'object' && 'orders' in res) rows = (res as { orders: unknown[] }).orders ?? []
  else if (res && typeof res === 'object' && 'items' in res) rows = (res as { items: unknown[] }).items ?? []
  return rows.map(mapOrder)
}

/** GET /orders — polls every 30s while any order is active. */
export function useOrders() {
  const isAuthed = useAuthStore((s) => s.isAuthenticated)
  return useQuery({
    queryKey: qk.orders,
    queryFn: async () => normalizeOrders(await apiGet<unknown>('/orders')),
    enabled: isAuthed,
    staleTime: 15_000,
    refetchInterval: (q) => {
      const data = q.state.data as Order[] | undefined
      return data?.some((o) => isActiveOrder(o.status)) ? 30_000 : false
    },
  })
}

/** GET /orders/:id — polls every 20s while the order is active. */
export function useOrder(id: string | undefined) {
  return useQuery({
    queryKey: id ? qk.order(id) : ['orders', 'none'],
    queryFn: async () => mapOrder(await apiGet<unknown>(`/orders/${id}`)),
    enabled: !!id,
    staleTime: 10_000,
    refetchInterval: (q) => {
      const data = q.state.data as Order | undefined
      return data && isActiveOrder(data.status) ? 20_000 : false
    },
  })
}

/** POST /orders/:id/cancel */
export function useCancelOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => apiPost(`/orders/${id}/cancel`, { reason }),
    onSuccess: (_d, { id }) => {
      qc.invalidateQueries({ queryKey: qk.order(id) })
      qc.invalidateQueries({ queryKey: qk.orders })
    },
  })
}
