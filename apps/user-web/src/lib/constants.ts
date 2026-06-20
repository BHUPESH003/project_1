import { OrderStatus } from '@repo/types'
import type { IconName } from '@repo/icons'

/** Central React Query keys. */
export const qk = {
  me: ['me'] as const,
  addresses: ['addresses'] as const,
  categories: ['categories'] as const,
  subcategories: (categoryId: string) => ['subcategories', categoryId] as const,
  banners: ['banners'] as const,
  sellers: (params: unknown) => ['sellers', params] as const,
  trending: ['sellers', 'trending'] as const,
  newSellers: ['sellers', 'new'] as const,
  seller: (id: string, params?: unknown) => ['seller', id, params] as const,
  sellerProducts: (id: string, params?: unknown) => ['seller', id, 'products', params] as const,
  search: (q: string) => ['search', q] as const,
  productBrowse: (params: unknown) => ['product-browse', params] as const,
  favorites: ['favorites'] as const,
  cart: ['cart'] as const,
  checkout: (addressId: string) => ['checkout', 'multi', addressId] as const,
  orders: ['orders'] as const,
  order: (id: string) => ['orders', id] as const,
  autocomplete: (q: string) => ['autocomplete', q] as const,
}

/** Category id → hyperlocal icon name. Falls back to storefront. */
export const categoryIcons: Record<string, IconName> = {
  // Short / lowercase IDs
  printing: 'printer',
  hardware: 'wrench',
  stationery: 'package',
  sports: 'lightning',
  tennis: 'lightning',
  swimming: 'lightning',
  cycling: 'lightning',
  marketing: 'tag',
  gifts: 'gift',
  gift: 'gift',
  grocery: 'basket',
  groceries: 'basket',
  repairs: 'wrench',
  repair: 'wrench',
  // Multi-word IDs that come from the backend (lowercased for matching)
  'printing services': 'printer',
  'marketing materials': 'tag',
}
export function categoryIcon(id: string): IconName {
  return categoryIcons[id.toLowerCase()] ?? 'storefront'
}

/** Order status → display label. */
export const orderStatusLabel: Record<OrderStatus, string> = {
  [OrderStatus.CREATED]: 'Created',
  [OrderStatus.SELLER_SELECTED]: 'Confirming',
  [OrderStatus.PAID]: 'Paid',
  [OrderStatus.SELLER_ACCEPTED]: 'Accepted',
  [OrderStatus.PREPARING]: 'Preparing',
  [OrderStatus.READY_FOR_PICKUP]: 'Ready for pickup',
  [OrderStatus.PICKED_UP]: 'Out for delivery',
  [OrderStatus.DELIVERED]: 'Delivered',
  [OrderStatus.SELLER_REJECTED]: 'Rejected',
  [OrderStatus.ORDER_EXPIRED]: 'Expired',
  [OrderStatus.DELIVERY_FAILED]: 'Delivery failed',
  [OrderStatus.USER_CANCELLED]: 'Cancelled',
}

export type BadgeTone = 'primary' | 'success' | 'warning' | 'danger' | 'neutral'

/** Order status → badge tone (per WEB_APP_BUILD_INSTRUCTIONS colour map). */
export const orderStatusTone: Record<OrderStatus, BadgeTone> = {
  [OrderStatus.CREATED]: 'neutral',
  [OrderStatus.SELLER_SELECTED]: 'neutral',
  [OrderStatus.PAID]: 'primary',
  [OrderStatus.SELLER_ACCEPTED]: 'primary',
  [OrderStatus.PREPARING]: 'warning',
  [OrderStatus.READY_FOR_PICKUP]: 'primary',
  [OrderStatus.PICKED_UP]: 'primary',
  [OrderStatus.DELIVERED]: 'success',
  [OrderStatus.SELLER_REJECTED]: 'danger',
  [OrderStatus.ORDER_EXPIRED]: 'danger',
  [OrderStatus.DELIVERY_FAILED]: 'danger',
  [OrderStatus.USER_CANCELLED]: 'danger',
}

/** Statuses that are still "active" (worth polling). */
export const ACTIVE_ORDER_STATUSES: OrderStatus[] = [
  OrderStatus.CREATED,
  OrderStatus.SELLER_SELECTED,
  OrderStatus.PAID,
  OrderStatus.SELLER_ACCEPTED,
  OrderStatus.PREPARING,
  OrderStatus.READY_FOR_PICKUP,
  OrderStatus.PICKED_UP,
]

export function isActiveOrder(status: OrderStatus): boolean {
  return ACTIVE_ORDER_STATUSES.includes(status)
}

/** Ordered happy-path timeline for the order-detail screen. */
export const ORDER_TIMELINE: OrderStatus[] = [
  OrderStatus.PAID,
  OrderStatus.SELLER_ACCEPTED,
  OrderStatus.PREPARING,
  OrderStatus.READY_FOR_PICKUP,
  OrderStatus.PICKED_UP,
  OrderStatus.DELIVERED,
]
