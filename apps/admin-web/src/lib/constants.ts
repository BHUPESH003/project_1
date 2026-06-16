import { OrderStatus } from '@repo/types'
import type { PayoutStatus } from '@/types/api'

/** Semantic tones shared by Badge and other status chips. */
export type BadgeTone = 'primary' | 'success' | 'warning' | 'danger' | 'neutral'

/** React Query keys — central registry so invalidation stays consistent. */
export const qk = {
  me: ['me'] as const,
  analyticsOverview: ['analytics', 'overview'] as const,
  ordersAnalytics: (params: unknown) => ['analytics', 'orders', params] as const,
  sellersAnalytics: (params: unknown) => ['analytics', 'sellers', params] as const,
  orders: (params: unknown) => ['admin-orders', params] as const,
  order: (id: string) => ['admin-order', id] as const,
  sellers: (params: unknown) => ['admin-sellers', params] as const,
  seller: (id: string) => ['admin-seller', id] as const,
  sellerProducts: (id: string) => ['admin-seller-products', id] as const,
  banners: ['admin-banners'] as const,
  banner: (id: string) => ['admin-banner', id] as const,
  categories: ['categories'] as const,
  payouts: (params: unknown) => ['admin-payouts', params] as const,
}

/** Default page size for paginated list tables. */
export const PAGE_SIZE = 20

/** A PAID order with no seller action after this many minutes is "stale". */
export const STALE_ORDER_MINUTES = 15

/** Human labels for the 12 order statuses. */
export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  [OrderStatus.CREATED]: 'Created',
  [OrderStatus.SELLER_SELECTED]: 'Seller selected',
  [OrderStatus.PAID]: 'Paid',
  [OrderStatus.SELLER_ACCEPTED]: 'Accepted',
  [OrderStatus.PREPARING]: 'Preparing',
  [OrderStatus.READY_FOR_PICKUP]: 'Ready for pickup',
  [OrderStatus.PICKED_UP]: 'Picked up',
  [OrderStatus.DELIVERED]: 'Delivered',
  [OrderStatus.SELLER_REJECTED]: 'Seller rejected',
  [OrderStatus.ORDER_EXPIRED]: 'Expired',
  [OrderStatus.DELIVERY_FAILED]: 'Delivery failed',
  [OrderStatus.USER_CANCELLED]: 'Cancelled',
}

/** Tone mapping for order status pills. */
export const ORDER_STATUS_TONE: Record<OrderStatus, BadgeTone> = {
  [OrderStatus.CREATED]: 'neutral',
  [OrderStatus.SELLER_SELECTED]: 'primary',
  [OrderStatus.PAID]: 'warning',
  [OrderStatus.SELLER_ACCEPTED]: 'primary',
  [OrderStatus.PREPARING]: 'primary',
  [OrderStatus.READY_FOR_PICKUP]: 'primary',
  [OrderStatus.PICKED_UP]: 'primary',
  [OrderStatus.DELIVERED]: 'success',
  [OrderStatus.SELLER_REJECTED]: 'danger',
  [OrderStatus.ORDER_EXPIRED]: 'neutral',
  [OrderStatus.DELIVERY_FAILED]: 'danger',
  [OrderStatus.USER_CANCELLED]: 'danger',
}

/** Statuses considered terminal (no admin intervention possible). */
export const TERMINAL_ORDER_STATUSES: OrderStatus[] = [
  OrderStatus.DELIVERED,
  OrderStatus.SELLER_REJECTED,
  OrderStatus.ORDER_EXPIRED,
  OrderStatus.USER_CANCELLED,
]

export const PAYOUT_STATUS_TONE: Record<PayoutStatus, BadgeTone> = {
  PENDING: 'warning',
  PROCESSING: 'primary',
  COMPLETED: 'success',
  REJECTED: 'danger',
}

export const CATEGORY_STATUS_TONE: Record<string, BadgeTone> = {
  ACTIVE: 'success',
  COMING_SOON: 'warning',
  INACTIVE: 'neutral',
}
