import { useMemo, useState } from 'react'
import { OrderStatus } from '@repo/types'
import { Inbox } from 'lucide-react'
import { StackHeader } from '@/components/layout/StackHeader'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { OrderCard } from '@/components/orders/OrderCard'
import { useSellerOrders } from '@/api/hooks/useSellerOrders'
import { getErrorMessage } from '@/api/client'
import { cn } from '@/lib/cn'

type Filter = 'all' | 'completed' | 'rejected' | 'cancelled'

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'completed', label: 'Completed' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'cancelled', label: 'Cancelled' },
]

const TERMINAL = new Set<string>([
  OrderStatus.DELIVERED,
  OrderStatus.SELLER_REJECTED,
  OrderStatus.ORDER_EXPIRED,
  OrderStatus.DELIVERY_FAILED,
  OrderStatus.USER_CANCELLED,
])

export function OrderHistoryPage() {
  const [filter, setFilter] = useState<Filter>('all')
  const { data: orders, isLoading, error, refetch } = useSellerOrders()

  const rows = useMemo(() => {
    const all = (orders ?? []).filter((o) => TERMINAL.has(o.status))
    switch (filter) {
      case 'completed':
        return all.filter((o) => o.status === OrderStatus.DELIVERED)
      case 'rejected':
        return all.filter((o) => o.status === OrderStatus.SELLER_REJECTED)
      case 'cancelled':
        return all.filter(
          (o) =>
            o.status === OrderStatus.USER_CANCELLED ||
            o.status === OrderStatus.ORDER_EXPIRED ||
            o.status === OrderStatus.DELIVERY_FAILED,
        )
      default:
        return all
    }
  }, [orders, filter])

  return (
    <div>
      <StackHeader title="Order history" />

      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-3">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              'shrink-0 rounded-full border px-4 py-2 text-subhead font-semibold transition-colors',
              filter === f.key
                ? 'border-primary bg-primary text-on-primary'
                : 'border-border bg-surface text-text-2',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="px-4 pb-6">
        {isLoading ? (
          <div className="flex flex-col gap-2.5">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : error ? (
          <ErrorState message={getErrorMessage(error)} onRetry={() => refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState icon={<Inbox size={34} />} title="No orders yet" description="Past orders will appear here." />
        ) : (
          <div className="flex flex-col gap-2.5">
            {rows.map((o) => (
              <OrderCard key={o.order_id} order={o} compact />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
