import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/api/client'
import { qk } from '@/lib/constants'
import { useAuthStore } from '@/stores/authStore'
import type {
  AnalyticsGranularity,
  AnalyticsOverview,
  OrdersAnalytics,
  SellersAnalytics,
} from '@/types/api'

/** GET /admin/analytics/overview — KPI counts for the dashboard. */
export function useAnalyticsOverview() {
  const isAuthed = useAuthStore((s) => s.isAuthenticated)
  return useQuery({
    queryKey: qk.analyticsOverview,
    queryFn: () => apiGet<AnalyticsOverview>('/admin/analytics/overview'),
    enabled: isAuthed,
    staleTime: 30_000,
  })
}

export interface OrdersAnalyticsParams {
  startDate?: string
  endDate?: string
  granularity?: AnalyticsGranularity
}

/** GET /admin/analytics/orders — trends, AOV, cancellation & rejection rates. */
export function useOrdersAnalytics(params: OrdersAnalyticsParams) {
  const isAuthed = useAuthStore((s) => s.isAuthenticated)
  return useQuery({
    queryKey: qk.ordersAnalytics(params),
    queryFn: () =>
      apiGet<OrdersAnalytics>('/admin/analytics/orders', { params }),
    enabled: isAuthed,
    staleTime: 60_000,
  })
}

/** GET /admin/analytics/sellers — top sellers by revenue/orders/fulfilment. */
export function useSellersAnalytics(limit = 10) {
  const isAuthed = useAuthStore((s) => s.isAuthenticated)
  return useQuery({
    queryKey: qk.sellersAnalytics({ limit }),
    queryFn: () =>
      apiGet<SellersAnalytics>('/admin/analytics/sellers', { params: { limit } }),
    enabled: isAuthed,
    staleTime: 60_000,
  })
}
