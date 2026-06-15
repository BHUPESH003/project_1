import type { OrderStatus } from '@repo/types'
import type { EarningsPeriod } from '@/types/api'

/** Semantic tones shared by Badge and other status chips. */
export type BadgeTone = 'primary' | 'success' | 'warning' | 'danger' | 'neutral'

/** React Query keys — central registry so invalidation stays consistent. */
export const qk = {
  me: ['me'] as const,
  sellerProfile: ['seller', 'me'] as const,
  categories: ['categories'] as const,
  sellerOrders: (status?: OrderStatus | 'ALL') => ['seller-orders', status ?? 'ALL'] as const,
  paidOrders: ['seller-orders', 'PAID'] as const,
  order: (id: string) => ['order', id] as const,
  products: (search?: string) => ['products', search ?? ''] as const,
  earnings: (period: EarningsPeriod) => ['earnings', period] as const,
  payouts: ['payouts'] as const,
  autocomplete: (q: string) => ['autocomplete', q] as const,
}

/** Seconds before a new (PAID) order auto-declines on the backend. */
export const AUTO_DECLINE_SECONDS = 5 * 60

/** Poll interval (ms) for new orders while ONLINE. */
export const NEW_ORDER_POLL_MS = 5000

/** Poll interval (ms) for in-progress order sections. */
export const ACTIVE_POLL_MS = 15000
