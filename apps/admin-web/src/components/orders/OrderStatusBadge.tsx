import type { OrderStatus } from '@repo/types'
import { Badge } from '@/components/ui/Badge'
import { ORDER_STATUS_LABEL, ORDER_STATUS_TONE } from '@/lib/constants'

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge tone={ORDER_STATUS_TONE[status] ?? 'neutral'}>{ORDER_STATUS_LABEL[status] ?? status}</Badge>
}
