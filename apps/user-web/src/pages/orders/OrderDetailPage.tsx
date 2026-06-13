import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Check, Store, Truck, Phone, FileText, MapPin } from 'lucide-react'
import { OrderStatus } from '@repo/types'
import { useOrder, useCancelOrder } from '@/api/hooks/useOrders'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { ErrorState } from '@/components/ui/States'
import { BottomSheet } from '@/components/sheets/BottomSheet'
import { orderStatusLabel, orderStatusTone, ORDER_TIMELINE, isActiveOrder } from '@/lib/constants'
import { money, timeAgo, toNum } from '@/lib/format'
import { toast } from '@/stores/toastStore'
import { getErrorMessage } from '@/api/client'
import { cn } from '@/lib/cn'

const FAILURE_STATES: OrderStatus[] = [
  OrderStatus.SELLER_REJECTED,
  OrderStatus.ORDER_EXPIRED,
  OrderStatus.DELIVERY_FAILED,
  OrderStatus.USER_CANCELLED,
]

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: order, isLoading, isError, refetch } = useOrder(id)
  const cancel = useCancelOrder()
  const [confirmOpen, setConfirmOpen] = useState(false)

  if (isLoading) {
    return (
      <div className="px-5 pt-4">
        <Skeleton className="mb-4 h-8 w-40" />
        <Skeleton className="mb-3 h-24 w-full rounded-lg" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    )
  }
  if (isError || !order) {
    return (
      <div className="pt-10">
        <ErrorState message="Couldn't load this order." onRetry={() => refetch()} />
      </div>
    )
  }

  const failed = FAILURE_STATES.includes(order.status)
  const currentIdx = ORDER_TIMELINE.indexOf(order.status)
  const cancellable = isActiveOrder(order.status) && order.status !== OrderStatus.PICKED_UP

  async function doCancel() {
    if (!id) return
    try {
      await cancel.mutateAsync({ id })
      toast.success('Order cancelled. Refund initiated if paid.')
      setConfirmOpen(false)
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  const files = (order.orderPayload as { files?: { originalName?: string; pageCount?: number }[] } | undefined)?.files
  const lineItems = order.items ?? []

  return (
    <div className="px-5 pb-28 pt-3">
      <div className="mb-3 flex items-center gap-2">
        <button onClick={() => navigate(-1)} aria-label="Back" className="tap -ml-2 grid h-10 w-10 place-items-center text-text-2">
          <ArrowLeft size={22} />
        </button>
        <div>
          <h1 className="text-title font-bold text-text">Order #{(order.id ?? '').slice(-6).toUpperCase()}</h1>
          <p className="text-caption text-text-3">{timeAgo(order.createdAt)}</p>
        </div>
      </div>

      {/* Status banner */}
      <div
        className={cn(
          'rounded-lg px-4 py-4',
          failed ? 'bg-danger-soft' : order.status === OrderStatus.DELIVERED ? 'bg-success-soft' : 'bg-primary-soft',
        )}
      >
        <div className="flex items-center justify-between">
          <span className={cn('text-title font-bold', failed ? 'text-danger' : order.status === OrderStatus.DELIVERED ? 'text-success' : 'text-on-primary-soft')}>
            {orderStatusLabel[order.status]}
          </span>
          <Badge tone={orderStatusTone[order.status]}>{order.seller?.shopName ?? 'Shop'}</Badge>
        </div>
        {order.failureReason && <p className="mt-1 text-subhead text-text-2">{order.failureReason}</p>}
      </div>

      {/* Timeline */}
      {!failed && (
        <div className="mt-5 rounded-lg border border-border bg-surface p-4">
          <ol className="relative">
            {ORDER_TIMELINE.map((step, i) => {
              const done = currentIdx >= 0 && i <= currentIdx
              const isCurrent = i === currentIdx
              const last = i === ORDER_TIMELINE.length - 1
              return (
                <li key={step} className="flex gap-3 pb-5 last:pb-0">
                  <div className="flex flex-col items-center">
                    <span
                      className={cn(
                        'grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 transition-colors',
                        done ? 'border-primary bg-primary text-on-primary' : 'border-border-strong bg-surface text-text-3',
                        isCurrent && 'pulse-dot',
                      )}
                    >
                      {done ? <Check size={15} strokeWidth={3} /> : <span className="h-2 w-2 rounded-full bg-current" />}
                    </span>
                    {!last && <span className={cn('mt-1 w-0.5 flex-1', done ? 'bg-primary' : 'bg-border')} />}
                  </div>
                  <span className={cn('pt-1 text-subhead', done ? 'font-semibold text-text' : 'text-text-3')}>
                    {orderStatusLabel[step]}
                  </span>
                </li>
              )
            })}
          </ol>
        </div>
      )}

      {/* Delivery */}
      {order.delivery && (
        <div className="mt-4 rounded-lg border border-border bg-surface p-4">
          <p className="mb-2 flex items-center gap-1.5 text-subhead font-bold text-text">
            <Truck size={16} /> Delivery
          </p>
          <p className="text-subhead text-text-2">{order.delivery.providerName ?? 'Delivery partner'}</p>
          {order.delivery.partnerName && (
            <div className="mt-2 flex items-center justify-between">
              <span className="text-subhead text-text">{order.delivery.partnerName}</span>
              {order.delivery.partnerPhone && (
                <a href={`tel:${order.delivery.partnerPhone}`} className="flex items-center gap-1 text-subhead font-semibold text-primary">
                  <Phone size={14} /> Call
                </a>
              )}
            </div>
          )}
          {order.delivery.providerTrackingUrl && (
            <a href={order.delivery.providerTrackingUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-subhead font-semibold text-primary">
              Track live →
            </a>
          )}
        </div>
      )}

      {/* Items */}
      <div className="mt-4 rounded-lg border border-border bg-surface p-4">
        <p className="mb-2 flex items-center gap-1.5 text-subhead font-bold text-text">
          <Store size={16} /> Items
        </p>
        {files?.length ? (
          files.map((f, i) => (
            <div key={i} className="flex items-center gap-2 py-1 text-subhead text-text-2">
              <FileText size={15} className="shrink-0 text-text-3" />
              <span className="truncate">
                {f.originalName ?? 'Document'}
                {f.pageCount ? ` · ${f.pageCount} pages` : ''}
              </span>
            </div>
          ))
        ) : lineItems.length ? (
          lineItems.map((it, i) => (
            <div key={i} className="flex items-center justify-between py-1 text-subhead text-text-2">
              <span className="truncate">
                {it.name}
                {it.quantity > 1 ? ` × ${it.quantity}` : ''}
              </span>
              {it.totalPrice != null && <span className="mono-num shrink-0">{money(it.totalPrice)}</span>}
            </div>
          ))
        ) : (
          <p className="text-subhead text-text-2">Order items</p>
        )}
        {order.dropAddress && (
          <p className="mt-3 flex items-start gap-1.5 text-caption text-text-3">
            <MapPin size={14} className="mt-0.5 shrink-0" /> {order.dropAddress}
          </p>
        )}
      </div>

      {/* Pricing */}
      <div className="mt-4 rounded-lg border border-border bg-surface p-4">
        <div className="flex justify-between py-1 text-subhead text-text-2">
          <span>Items</span>
          <span className="mono-num">{money(order.itemCost ?? order.totalAmount)}</span>
        </div>
        {order.deliveryFee != null && toNum(order.deliveryFee) > 0 && (
          <div className="flex justify-between py-1 text-subhead text-text-2">
            <span>Delivery (paid to partner)</span>
            <span className="mono-num">{money(order.deliveryFee)}</span>
          </div>
        )}
        <div className="my-2 border-t border-border" />
        <div className="flex items-center justify-between">
          <span className="text-body font-semibold text-text">Total paid</span>
          <span className="text-title font-bold text-primary mono-num">{money(order.totalAmount)}</span>
        </div>
      </div>

      {cancellable && (
        <Button variant="danger" full className="mt-5" onClick={() => setConfirmOpen(true)}>
          Cancel order
        </Button>
      )}

      <BottomSheet open={confirmOpen} onOpenChange={setConfirmOpen} title="Cancel this order?">
        <p className="text-subhead text-text-2">
          If you've paid, a refund will be initiated automatically. This can't be undone.
        </p>
        <div className="mt-5 flex gap-2 pb-2">
          <Button variant="secondary" full onClick={() => setConfirmOpen(false)}>
            Keep order
          </Button>
          <Button variant="danger" full loading={cancel.isPending} onClick={doCancel}>
            Cancel order
          </Button>
        </div>
      </BottomSheet>
    </div>
  )
}
