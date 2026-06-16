import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost } from '@/api/client'
import { qk } from '@/lib/constants'
import { useAuthStore } from '@/stores/authStore'
import type {
  DeliveryProvider,
  DeliveryStatus,
  PaymentMethod,
  PaymentStatus,
} from '@repo/types'
import type { AdminOrderDetail, AdminOrderRow } from '@/types/api'

/* ── Raw (snake_case) wire shapes — contained to this file ───────────────── */

interface RawOrderRow {
  order_id: string
  status: AdminOrderRow['status']
  user: { id: string; phone: string; name: string | null }
  seller: { id: string; shop_name: string; address: string } | null
  category: { id: string; name: string }
  item_cost: number | null
  delivery_fee: number | null
  total_amount: number | null
  created_at: string
  updated_at: string
}

interface RawOrderList {
  data: RawOrderRow[]
  pagination: { page: number; limit: number; total: number; total_pages: number }
}

interface RawOrderDetail extends RawOrderRow {
  order_payload: Record<string, unknown>
  drop_address: string | null
  failure_reason: string | null
  completed_at: string | null
  payment: Record<string, unknown> | null
  delivery: Record<string, unknown> | null
  files: Record<string, unknown>[]
  state_history: Record<string, unknown>[]
}

function normRow(r: RawOrderRow): AdminOrderRow {
  return {
    orderId: r.order_id,
    status: r.status,
    user: r.user,
    seller: r.seller
      ? { id: r.seller.id, shopName: r.seller.shop_name, address: r.seller.address }
      : null,
    category: r.category,
    itemCost: r.item_cost,
    deliveryFee: r.delivery_fee,
    totalAmount: r.total_amount,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

function normDetail(r: RawOrderDetail): AdminOrderDetail {
  const p = r.payment as Record<string, unknown> | null
  const d = r.delivery as Record<string, unknown> | null
  return {
    ...normRow(r),
    orderPayload: r.order_payload ?? {},
    dropAddress: r.drop_address,
    failureReason: r.failure_reason,
    completedAt: r.completed_at,
    payment: p
      ? {
          id: p.id as string,
          amount: p.amount as number,
          method: p.method as PaymentMethod,
          status: p.status as PaymentStatus,
          gatewayName: (p.gateway_name as string) ?? null,
          gatewayPaymentId: (p.gateway_payment_id as string) ?? null,
          refundAmount: (p.refund_amount as number) ?? null,
          refundStatus: (p.refund_status as string) ?? null,
          refundedAt: (p.refunded_at as string) ?? null,
          paidAt: (p.paid_at as string) ?? null,
        }
      : null,
    delivery: d
      ? {
          id: d.id as string,
          providerName: (d.provider_name as string) ?? null,
          providerTaskId: (d.provider_task_id as string) ?? null,
          providerTrackingUrl: (d.provider_tracking_url as string) ?? null,
          status: d.status as DeliveryStatus,
          partnerName: (d.partner_name as string) ?? null,
          partnerPhone: (d.partner_phone as string) ?? null,
          failureReason: (d.failure_reason as string) ?? null,
        }
      : null,
    files: (r.files ?? []).map((f) => ({
      id: f.id as string,
      originalName: f.original_name as string,
      mimeType: f.mime_type as string,
      sizeBytes: f.size_bytes as number,
      storageUrl: f.storage_url as string,
      pageCount: (f.page_count as number) ?? null,
    })),
    stateHistory: (r.state_history ?? []).map((h) => ({
      id: h.id as string,
      fromStatus: (h.from_status as AdminOrderDetail['status']) ?? null,
      toStatus: h.to_status as AdminOrderDetail['status'],
      triggeredBy: (h.triggered_by as string) ?? null,
      reason: (h.reason as string) ?? null,
      createdAt: h.created_at as string,
    })),
  }
}

/* ── Hooks ───────────────────────────────────────────────────────────────── */

export interface OrderFilters {
  status?: string
  sellerId?: string
  startDate?: string
  endDate?: string
  page?: number
  limit?: number
}

export interface AdminOrderList {
  rows: AdminOrderRow[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}

export function useAdminOrders(filters: OrderFilters) {
  const isAuthed = useAuthStore((s) => s.isAuthenticated)
  return useQuery<AdminOrderList>({
    queryKey: qk.orders(filters),
    queryFn: async () => {
      const params: Record<string, unknown> = {}
      if (filters.status) params.status = filters.status
      if (filters.sellerId) params.sellerId = filters.sellerId
      if (filters.startDate) params.startDate = filters.startDate
      if (filters.endDate) params.endDate = filters.endDate
      params.page = filters.page ?? 1
      params.limit = filters.limit ?? 20
      const res = await apiGet<RawOrderList>('/admin/orders', { params })
      return {
        rows: res.data.map(normRow),
        pagination: {
          page: res.pagination.page,
          limit: res.pagination.limit,
          total: res.pagination.total,
          totalPages: res.pagination.total_pages,
        },
      }
    },
    enabled: isAuthed,
    staleTime: 10_000,
  })
}

export function useAdminOrder(id: string | undefined) {
  const isAuthed = useAuthStore((s) => s.isAuthenticated)
  return useQuery({
    queryKey: qk.order(id ?? ''),
    queryFn: async () => normDetail(await apiGet<RawOrderDetail>(`/admin/orders/${id}`)),
    enabled: isAuthed && !!id,
  })
}

function useOrderMutation<TVars>(
  fn: (id: string, vars: TVars) => Promise<unknown>,
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, vars }: { id: string; vars: TVars }) => fn(id, vars),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: qk.order(id) })
      qc.invalidateQueries({ queryKey: ['admin-orders'] })
    },
  })
}

export function useReassignSeller() {
  return useOrderMutation<{ sellerId: string; reason?: string }>((id, vars) =>
    apiPost(`/admin/orders/${id}/reassign-seller`, vars),
  )
}

export function useReassignDelivery() {
  return useOrderMutation<{ provider: DeliveryProvider; trackingId: string }>((id, vars) =>
    apiPost(`/admin/orders/${id}/reassign-delivery`, vars),
  )
}

export function useCancelOrder() {
  return useOrderMutation<{ reason?: string; refundAmount?: number }>((id, vars) =>
    apiPost(`/admin/orders/${id}/cancel`, vars),
  )
}
