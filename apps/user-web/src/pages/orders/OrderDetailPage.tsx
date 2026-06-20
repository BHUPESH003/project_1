import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Check,
  Store,
  Truck,
  Phone,
  FileText,
  MapPin,
  Share2,
  MessageCircle,
  ChevronRight,
} from 'lucide-react'
import { OrderStatus } from '@repo/types'
import { useOrder, useCancelOrder, usePayDeliveryFee } from '@/api/hooks/useOrders'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { ErrorState } from '@/components/ui/States'
import { BottomSheet } from '@/components/sheets/BottomSheet'
import { orderStatusLabel, orderStatusTone, ORDER_TIMELINE } from '@/lib/constants'
import { money, toNum, assetUrl } from '@/lib/format'
import { toast } from '@/stores/toastStore'
import { getErrorMessage } from '@/api/client'
import { cn } from '@/lib/cn'

const FAILURE_STATES: OrderStatus[] = [
  OrderStatus.SELLER_REJECTED,
  OrderStatus.ORDER_EXPIRED,
  OrderStatus.DELIVERY_FAILED,
  OrderStatus.USER_CANCELLED,
]

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function fmtDay(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  if (d.toDateString() === today.toDateString()) return 'Today'
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: order, isLoading, isError, refetch } = useOrder(id)
  const cancel = useCancelOrder()
  const payDelivery = usePayDeliveryFee()
  const [confirmOpen, setConfirmOpen] = useState(false)

  if (isLoading) {
    return (
      <div className="px-4 pt-4 space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-28 w-full rounded-2xl" />
      </div>
    )
  }

  if (isError || !order) {
    return (
      <div className="pt-12">
        <ErrorState message="Couldn't load this order." onRetry={() => refetch()} />
      </div>
    )
  }

  const failed = FAILURE_STATES.includes(order.status)
  const currentIdx = ORDER_TIMELINE.indexOf(order.status)
  const progressPct =
    order.status === OrderStatus.DELIVERED
      ? 100
      : currentIdx >= 0
        ? Math.round((currentIdx / (ORDER_TIMELINE.length - 1)) * 100)
        : 0
  const cancellable =
    order.status === OrderStatus.CREATED ||
    order.status === OrderStatus.SELLER_SELECTED ||
    order.status === OrderStatus.PAID
  const deliveryFee = toNum(order.deliveryFee)
  // Show "pay delivery online" option when delivery fee was not paid online
  // and the order is in a state where payment still makes sense.
  const canPayDeliveryOnline =
    deliveryFee > 0 &&
    !order.deliveryFeePaid &&
    !FAILURE_STATES.includes(order.status) &&
    order.status !== OrderStatus.DELIVERED
  const shopImageUrl = assetUrl(order.seller?.imagePath, order.seller?.imageUrl)

  // Estimated delivery label from delivery record
  let etaLabel: string | null = null
  if (order.delivery?.estimatedMinutes) {
    const eta = new Date(new Date(order.createdAt).getTime() + order.delivery.estimatedMinutes * 60_000)
    etaLabel = `Estimated delivery: ${fmtTime(eta.toISOString())}`
  }

  const files =
    (order.orderPayload as { files?: { originalName?: string; pageCount?: number }[] } | undefined)?.files
  const lineItems = order.items ?? []

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

  return (
    <div className="flex flex-col pb-10">
      {/* Header */}
      <div className="mb-1 flex items-center gap-3 px-4 pt-3 pb-2">
        <button
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="tap -ml-2 grid h-9 w-9 place-items-center rounded-full text-text-2"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="flex-1 text-center text-body font-bold text-text">Order Details</h1>
        <button
          aria-label="Share"
          className="tap grid h-9 w-9 place-items-center rounded-full text-text-2"
          onClick={() => navigator.share?.({ title: 'Order', text: `Order #${(order.id ?? '').slice(-5).toUpperCase()}` })}
        >
          <Share2 size={18} />
        </button>
      </div>

      <div className="flex flex-col gap-3 px-4">
        {/* ── Seller card ── */}
        <div className="rounded-2xl border border-border bg-surface p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary-soft">
              {shopImageUrl ? (
                <img src={shopImageUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <Store size={22} className="text-primary" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-body font-bold text-text">{order.seller?.shopName ?? 'Shop'}</p>
              <p className="mt-0.5 text-caption text-text-3">
                Order #{(order.id ?? '').slice(-5).toUpperCase()} &bull;{' '}
                {fmtDay(order.createdAt)}, {fmtTime(order.createdAt)}
              </p>
            </div>
            <Badge tone={orderStatusTone[order.status]}>{orderStatusLabel[order.status]}</Badge>
          </div>

          {!failed && (
            <div className="mt-4">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              {etaLabel && <p className="mt-2 text-caption text-text-3">{etaLabel}</p>}
            </div>
          )}

          {failed && order.failureReason && (
            <p className="mt-3 rounded-lg bg-danger-soft px-3 py-2 text-caption text-danger">
              {order.failureReason}
            </p>
          )}
        </div>

        {/* ── Items Ordered ── */}
        <div className="rounded-2xl border border-border bg-surface p-4">
          <p className="mb-3 text-caption font-bold uppercase tracking-wide text-text-3">Items Ordered</p>

          {files?.length ? (
            <div className="space-y-2">
              {files.map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-subhead text-text-2">
                  <FileText size={15} className="shrink-0 text-text-3" />
                  <span className="truncate">
                    {f.originalName ?? 'Document'}
                    {f.pageCount ? ` · ${f.pageCount} pages` : ''}
                  </span>
                </div>
              ))}
            </div>
          ) : lineItems.length ? (
            <div className="divide-y divide-border">
              {lineItems.map((it, i) => (
                <div key={i} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <span className="w-6 shrink-0 text-right text-caption font-semibold text-text-3">
                    {it.quantity}×
                  </span>
                  <p className="flex-1 truncate text-subhead font-medium text-text">{it.name}</p>
                  {it.totalPrice != null && (
                    <span className="shrink-0 text-subhead font-semibold text-text mono-num">
                      {money(it.totalPrice)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-subhead text-text-2">Order items</p>
          )}

          {order.dropAddress && (
            <div className="mt-3 flex items-start gap-1.5 border-t border-border pt-3">
              <MapPin size={14} className="mt-0.5 shrink-0 text-text-3" />
              <p className="text-caption text-text-3">{order.dropAddress}</p>
            </div>
          )}
        </div>

        {/* ── Bill Summary ── */}
        <div className="rounded-2xl border border-border bg-surface p-4">
          <div className="flex justify-between py-1.5">
            <span className="text-subhead text-text-2">Subtotal</span>
            <span className="text-subhead text-text-2 mono-num">{money(order.itemCost ?? order.totalAmount)}</span>
          </div>

          {deliveryFee > 0 && (
            <div className="flex items-center justify-between py-1.5">
              <span className="text-subhead text-text-2">Delivery Fee</span>
              <div className="flex items-center gap-2">
                <span className="text-subhead text-text-2 mono-num">{money(order.deliveryFee)}</span>
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-micro font-semibold',
                    order.deliveryFeePaid
                      ? 'bg-success-soft text-success'
                      : 'bg-warning-soft text-warning',
                  )}
                >
                  {order.deliveryFeePaid ? 'Paid online' : 'Pay at door'}
                </span>
              </div>
            </div>
          )}

          <div className="my-2 border-t border-border" />

          <div className="flex items-center justify-between">
            <span className="text-body font-bold text-text">Total Paid</span>
            <span className="text-body font-bold text-text mono-num">{money(order.totalAmount)}</span>
          </div>

          {canPayDeliveryOnline && (
            <button
              type="button"
              disabled={payDelivery.isPending}
              onClick={async () => {
                try {
                  await payDelivery.mutateAsync({ orderId: order.id })
                  toast.success('Delivery fee paid online!')
                } catch (e) {
                  toast.error(getErrorMessage(e, 'Payment failed'))
                }
              }}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-primary py-2.5 text-subhead font-semibold text-primary transition-opacity disabled:opacity-60"
            >
              <Truck size={15} />
              {payDelivery.isPending ? 'Processing…' : `Pay delivery fee online (${money(deliveryFee)})`}
            </button>
          )}
        </div>

        {/* ── Delivery Partner ── */}
        {order.delivery && (
          <div className="rounded-2xl border border-border bg-surface p-4">
            <div className="mb-3 flex items-center gap-2">
              <Truck size={15} className="text-text-3" />
              <p className="text-caption font-bold uppercase tracking-wide text-text-3">Delivery</p>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-subhead font-semibold text-text">
                  {order.delivery.partnerName ?? order.delivery.providerName ?? 'Delivery partner'}
                </p>
                {order.delivery.partnerName && order.delivery.providerName && (
                  <p className="text-caption text-text-3">{order.delivery.providerName}</p>
                )}
              </div>
              {order.delivery.partnerPhone && (
                <a
                  href={`tel:${order.delivery.partnerPhone}`}
                  className="flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1.5 text-caption font-semibold text-primary"
                >
                  <Phone size={13} /> Call
                </a>
              )}
            </div>

            {order.delivery.providerTrackingUrl && (
              <a
                href={order.delivery.providerTrackingUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 flex items-center justify-between rounded-xl border border-border px-3 py-2.5"
              >
                <span className="text-subhead font-semibold text-primary">Track live</span>
                <ChevronRight size={15} className="text-text-3" />
              </a>
            )}
          </div>
        )}

        {/* ── Order Timeline ── */}
        {!failed && (
          <div className="rounded-2xl border border-border bg-surface p-4">
            <p className="mb-3 text-caption font-bold uppercase tracking-wide text-text-3">Order Timeline</p>
            <ol>
              {ORDER_TIMELINE.map((step, i) => {
                const done = currentIdx >= 0 && i <= currentIdx
                const isCurrent = i === currentIdx
                const last = i === ORDER_TIMELINE.length - 1
                return (
                  <li key={step} className="flex gap-3 pb-3.5 last:pb-0">
                    <div className="flex flex-col items-center">
                      <span
                        className={cn(
                          'grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition-colors',
                          done
                            ? 'border-primary bg-primary text-on-primary'
                            : 'border-border-strong bg-surface text-text-3',
                          isCurrent && 'pulse-dot',
                        )}
                      >
                        {done ? (
                          <Check size={12} strokeWidth={3} />
                        ) : (
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        )}
                      </span>
                      {!last && (
                        <span className={cn('mt-1 w-0.5 flex-1 min-h-4', done ? 'bg-primary' : 'bg-border')} />
                      )}
                    </div>
                    <span
                      className={cn(
                        'pt-0.5 text-subhead',
                        done ? 'font-semibold text-text' : 'text-text-3',
                      )}
                    >
                      {orderStatusLabel[step]}
                    </span>
                  </li>
                )
              })}
            </ol>
          </div>
        )}

        {/* ── Support ── */}
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3.5 tap"
          onClick={() => {
            const orderId = (order.id ?? '').slice(-5).toUpperCase()
            const msg = encodeURIComponent(`Hi, I need help with my order #${orderId}`)
            const SUPPORT_WA = import.meta.env.VITE_SUPPORT_WHATSAPP ?? '918000000000'
            window.open(`https://wa.me/${SUPPORT_WA}?text=${msg}`, '_blank', 'noopener')
          }}
        >
          <div className="grid h-9 w-9 place-items-center rounded-full bg-primary-soft">
            <MessageCircle size={18} className="text-primary" />
          </div>
          <span className="flex-1 text-left text-subhead font-medium text-text">
            Need help with this order?
          </span>
          <ChevronRight size={16} className="text-text-3" />
        </button>

        {cancellable && (
          <Button variant="danger" full className="mt-1" onClick={() => setConfirmOpen(true)}>
            Cancel order
          </Button>
        )}
      </div>

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
