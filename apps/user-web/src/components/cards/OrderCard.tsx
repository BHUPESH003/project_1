import { useNavigate } from 'react-router-dom'
import { Store, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { orderStatusLabel, orderStatusTone, isActiveOrder } from '@/lib/constants'
import { assetUrl, money, timeAgo } from '@/lib/format'
import { cn } from '@/lib/cn'
import type { Order } from '@/api/types'

function itemsSummary(order: Order): string {
  if (order.items?.length) {
    const names = order.items.map((it) => it.name).filter(Boolean)
    if (names.length === 1) return names[0]
    if (names.length > 1) return `${names[0]} +${names.length - 1} more`
  }
  const p = (order.orderPayload ?? {}) as { productName?: string; files?: unknown[] }
  if (p.productName) return p.productName
  if (Array.isArray(p.files) && p.files.length) return `${p.files.length} document${p.files.length === 1 ? '' : 's'}`
  return 'Order'
}

export function OrderCard({ order, prominent }: { order: Order; prominent?: boolean }) {
  const navigate = useNavigate()
  const active = isActiveOrder(order.status)
  const cover = assetUrl(order.seller?.imagePath, order.seller?.imageUrl)

  return (
    <button
      onClick={() => navigate(`/orders/${order.id}`)}
      className={cn(
        'flex w-full items-center gap-3 rounded-lg border bg-surface px-4 text-left',
        prominent ? 'border-border py-3.5 shadow-sm' : 'border-border-faint py-3',
      )}
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-surface-2 text-text-3">
        {cover ? <img src={cover} alt="" className="h-full w-full object-cover" /> : <Store size={18} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span className="truncate text-body font-semibold text-text">{order.seller?.shopName ?? 'Shop'}</span>
          <Badge tone={orderStatusTone[order.status]} className={cn(active && 'pulse-dot')}>
            {orderStatusLabel[order.status]}
          </Badge>
        </span>
        <span className="mt-0.5 flex items-center justify-between gap-2 text-caption text-text-2">
          <span className="truncate">
            #{(order.id ?? '').slice(-6).toUpperCase()} · {itemsSummary(order)}
          </span>
          <span className="mono-num shrink-0 font-semibold text-text">{money(order.totalAmount)}</span>
        </span>
        <span className="mt-0.5 block text-[11px] text-text-3">{timeAgo(order.createdAt)}</span>
      </span>
      <ChevronRight size={18} className="shrink-0 text-text-3" />
    </button>
  )
}
