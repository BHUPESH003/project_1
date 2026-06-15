import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { OrderStatus } from '@repo/types'
import { Clock, FileText } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { money, timeAgo } from '@/lib/format'
import {
  AUTO_DECLINE_SECONDS,
} from '@/lib/constants'
import {
  customerFirstName,
  itemsSummary,
  ORDER_STATUS_LABEL,
  statusTone,
} from '@/lib/orders'
import type { SellerOrderSummary } from '@/types/api'

function shortId(id: string) {
  return id.slice(-6).toUpperCase()
}

function Countdown({ createdAt }: { createdAt: string }) {
  const [secs, setSecs] = useState(() => {
    const elapsed = (Date.now() - new Date(createdAt).getTime()) / 1000
    return Math.max(0, Math.round(AUTO_DECLINE_SECONDS - elapsed))
  })
  useEffect(() => {
    const t = setInterval(() => {
      const elapsed = (Date.now() - new Date(createdAt).getTime()) / 1000
      setSecs(Math.max(0, Math.round(AUTO_DECLINE_SECONDS - elapsed)))
    }, 1000)
    return () => clearInterval(t)
  }, [createdAt])
  const pct = Math.max(0, Math.min(100, (secs / AUTO_DECLINE_SECONDS) * 100))
  const color = secs <= 30 ? 'bg-danger' : secs <= 120 ? 'bg-warning' : 'bg-success'
  const mm = Math.floor(secs / 60)
  const ss = (secs % 60).toString().padStart(2, '0')
  return (
    <div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
        <div className={`h-full rounded-full transition-all duration-1000 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1 text-micro text-text-3">
        Auto-declines in <span className="mono-num">{mm}:{ss}</span>
      </p>
    </div>
  )
}

interface OrderCardProps {
  order: SellerOrderSummary
  onAccept?: () => void
  onReject?: () => void
  onMarkReady?: () => void
  acceptLoading?: boolean
  rejectLoading?: boolean
  readyLoading?: boolean
  /** Compact read-only row (history / completed). */
  compact?: boolean
}

export function OrderCard({
  order,
  onAccept,
  onReject,
  onMarkReady,
  acceptLoading,
  rejectLoading,
  readyLoading,
  compact,
}: OrderCardProps) {
  const navigate = useNavigate()
  const isNew = order.status === OrderStatus.PAID
  const isPreparing =
    order.status === OrderStatus.SELLER_ACCEPTED || order.status === OrderStatus.PREPARING
  const fileCount = order.orderPayload?.items?.length ?? 0
  const tone = statusTone(order.status)

  const go = () => navigate(`/orders/${order.order_id}`)

  if (compact) {
    return (
      <button
        onClick={go}
        className="tap flex w-full items-center gap-3 rounded-xl border border-border bg-surface px-3.5 py-3 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-subhead font-semibold text-text">
              {customerFirstName(order.user?.name)}
            </span>
            <span className="mono-num text-micro text-text-3">#{shortId(order.order_id)}</span>
          </div>
          <p className="truncate text-caption text-text-2">{itemsSummary(order)}</p>
        </div>
        <div className="text-right">
          <p className="text-subhead font-bold text-text tnum">{money(order.pricing.totalAmount)}</p>
          <span className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-micro font-semibold ${tone.bg} ${tone.text}`}>
            {ORDER_STATUS_LABEL[order.status] ?? order.status}
          </span>
        </div>
      </button>
    )
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
      <button onClick={go} className="block w-full text-left">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-body font-bold text-text">
              {customerFirstName(order.user?.name)}{' '}
              <span className="mono-num text-caption font-normal text-text-3">
                #{shortId(order.order_id)}
              </span>
            </p>
            <p className="text-caption text-text-3">{timeAgo(order.createdAt)}</p>
          </div>
          <p className="shrink-0 text-title font-extrabold text-text tnum">
            {money(order.pricing.totalAmount)}
          </p>
        </div>

        <div className="mt-2 flex items-center gap-1.5 text-subhead text-text-2">
          {fileCount > 0 && <FileText size={15} className="text-text-3" />}
          <span className="truncate">{itemsSummary(order)}</span>
        </div>
      </button>

      {isNew && (
        <div className="mt-3">
          <Countdown createdAt={order.createdAt} />
          <div className="mt-3 flex gap-2">
            <Button full size="md" loading={acceptLoading} onClick={onAccept}>
              Accept
            </Button>
            <Button size="md" variant="secondary" loading={rejectLoading} onClick={onReject}>
              Reject
            </Button>
          </div>
        </div>
      )}

      {isPreparing && (
        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-caption text-text-3">
            <Clock size={14} /> Preparing
          </span>
          <Button size="md" loading={readyLoading} onClick={onMarkReady}>
            Mark Ready
          </Button>
        </div>
      )}

      {order.status === OrderStatus.READY_FOR_PICKUP && (
        <div className="mt-3 rounded-lg bg-success-soft px-3 py-2 text-subhead font-medium text-success">
          Ready — waiting for delivery pickup
        </div>
      )}
    </div>
  )
}
