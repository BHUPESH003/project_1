import { OrderStatus } from '@repo/types'
import type { OrderItem, SellerOrderSummary, SellerOrderDetail } from '@/types/api'

/** Human label for an order status. */
export const ORDER_STATUS_LABEL: Record<string, string> = {
  [OrderStatus.CREATED]: 'Created',
  [OrderStatus.SELLER_SELECTED]: 'Awaiting payment',
  [OrderStatus.PAID]: 'New',
  [OrderStatus.SELLER_ACCEPTED]: 'Accepted',
  [OrderStatus.PREPARING]: 'Preparing',
  [OrderStatus.READY_FOR_PICKUP]: 'Ready for pickup',
  [OrderStatus.PICKED_UP]: 'Picked up',
  [OrderStatus.DELIVERED]: 'Delivered',
  [OrderStatus.SELLER_REJECTED]: 'Rejected',
  [OrderStatus.ORDER_EXPIRED]: 'Expired',
  [OrderStatus.DELIVERY_FAILED]: 'Delivery failed',
  [OrderStatus.USER_CANCELLED]: 'Cancelled',
}

/** Tailwind tone (soft bg + text) for a status pill. */
export function statusTone(status: string): { bg: string; text: string } {
  switch (status) {
    case OrderStatus.PAID:
      return { bg: 'bg-warning-soft', text: 'text-warning' }
    case OrderStatus.SELLER_ACCEPTED:
    case OrderStatus.PREPARING:
      return { bg: 'bg-info-soft', text: 'text-info' }
    case OrderStatus.READY_FOR_PICKUP:
    case OrderStatus.PICKED_UP:
      return { bg: 'bg-success-soft', text: 'text-success' }
    case OrderStatus.DELIVERED:
      return { bg: 'bg-surface-2', text: 'text-text-2' }
    case OrderStatus.SELLER_REJECTED:
    case OrderStatus.ORDER_EXPIRED:
    case OrderStatus.DELIVERY_FAILED:
    case OrderStatus.USER_CANCELLED:
      return { bg: 'bg-danger-soft', text: 'text-danger' }
    default:
      return { bg: 'bg-surface-2', text: 'text-text-2' }
  }
}

/** First name of the customer (falls back to "Customer"). */
export function customerFirstName(name: string | null | undefined): string {
  if (!name) return 'Customer'
  return name.trim().split(/\s+/)[0]
}

function payloadItems(
  order: Pick<SellerOrderSummary, 'orderPayload'> | Pick<SellerOrderDetail, 'orderPayload' | 'items'>,
): OrderItem[] {
  const fromPayload = order.orderPayload?.items
  if (Array.isArray(fromPayload) && fromPayload.length) return fromPayload
  if ('items' in order && Array.isArray(order.items)) return order.items
  return []
}

/** Short one-line summary of the items in an order. */
export function itemsSummary(
  order: Pick<SellerOrderSummary, 'orderPayload'> | Pick<SellerOrderDetail, 'orderPayload' | 'items'>,
): string {
  const items = payloadItems(order)
  if (items.length === 0) return 'Order'
  const totalQty = items.reduce((n, it) => n + (it.quantity ?? 1), 0)
  const first = items[0]
  const name = first.name ?? 'Item'
  if (items.length === 1) return totalQty > 1 ? `${totalQty} × ${name}` : name
  return `${name} + ${items.length - 1} more`
}

/** Total page count across printing items (color/bw aware where present). */
export function printPages(item: OrderItem): number | null {
  if (item.pages == null) return null
  return item.pages * (item.copies ?? 1)
}
