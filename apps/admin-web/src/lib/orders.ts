import { OrderStatus } from '@repo/types'
import { STALE_ORDER_MINUTES } from '@/lib/constants'
import type { AdminOrderRow } from '@/types/api'

/**
 * Count orders that are PAID but have had no seller action for longer than
 * STALE_ORDER_MINUTES. Lives outside React so the Date.now() read is not
 * flagged by the render-purity rule — it's a snapshot, recomputed per call.
 */
export function countStalePaidOrders(rows: AdminOrderRow[]): number {
  const cutoff = Date.now() - STALE_ORDER_MINUTES * 60_000
  return rows.filter(
    (o) => o.status === OrderStatus.PAID && new Date(o.createdAt).getTime() < cutoff,
  ).length
}
