import { useParams } from 'react-router-dom'
import { OrderStatus } from '@repo/types'
import {
  FileText,
  Download,
  MapPin,
  Package,
  Truck,
} from 'lucide-react'
import { StackHeader } from '@/components/layout/StackHeader'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { ErrorState } from '@/components/ui/States'
import {
  useOrderDetail,
  useAcceptOrder,
  useRejectOrder,
  useMarkReady,
} from '@/api/hooks/useSellerOrders'
import { money, timeAgo } from '@/lib/format'
import { ORDER_STATUS_LABEL, printPages, statusTone } from '@/lib/orders'
import { getErrorMessage } from '@/api/client'
import { toast } from '@/stores/toastStore'
import type { OrderFile, OrderItem } from '@/types/api'

function colorLabel(color: OrderItem['color']): string | null {
  if (color == null) return null
  if (typeof color === 'boolean') return color ? 'Color' : 'B&W'
  const c = color.toLowerCase()
  if (c === 'color' || c === 'colour') return 'Color'
  if (c === 'bw' || c === 'b&w' || c === 'mono') return 'B&W'
  return color
}

function PrintItemRow({ item, file }: { item: OrderItem; file?: OrderFile }) {
  const total = printPages(item)
  const specs = [
    item.pages != null ? `${item.pages} pages` : null,
    item.paperSize,
    colorLabel(item.color),
    item.copies && item.copies > 1 ? `${item.copies} copies` : null,
  ].filter(Boolean)

  return (
    <div className="rounded-xl border border-border bg-surface p-3.5">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
          <FileText size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-subhead font-semibold text-text">
            {file?.originalName ?? item.name ?? 'Document'}
          </p>
          {specs.length > 0 && (
            <p className="mt-0.5 text-caption text-text-2">{specs.join(' • ')}</p>
          )}
          {total != null && (
            <p className="mt-0.5 text-caption font-medium text-text-3">
              {total} pages to print
            </p>
          )}
          {item.notes && (
            <p className="mt-1 rounded bg-surface-2 px-2 py-1 text-caption text-text-2">
              “{item.notes}”
            </p>
          )}
        </div>
      </div>
      {file && (
        <a href={file.url} target="_blank" rel="noopener noreferrer" className="mt-3 block">
          <Button full size="md" variant="secondary" icon={<Download size={16} />}>
            View file
          </Button>
        </a>
      )}
    </div>
  )
}

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: order, isLoading, error, refetch } = useOrderDetail(id)
  const accept = useAcceptOrder()
  const reject = useRejectOrder()
  const markReady = useMarkReady()

  async function action(fn: () => Promise<unknown>, msg: string) {
    try {
      await fn()
      toast.success(msg)
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  return (
    <div>
      <StackHeader
        title={order ? `Order #${order.order_id.slice(-6).toUpperCase()}` : 'Order'}
        subtitle={order ? timeAgo(order.createdAt) : undefined}
      />

      {isLoading ? (
        <div className="flex flex-col gap-3 p-4">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      ) : error || !order ? (
        <ErrorState message={error ? getErrorMessage(error) : 'Order not found'} onRetry={() => refetch()} />
      ) : (
        <div className="px-4 pb-28">
          {/* Status */}
          <div className="mt-4 flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3">
            <span className="text-subhead text-text-2">Status</span>
            <span
              className={`rounded-full px-2.5 py-1 text-caption font-bold ${statusTone(order.status).bg} ${statusTone(order.status).text}`}
            >
              {ORDER_STATUS_LABEL[order.status] ?? order.status}
            </span>
          </div>

          {/* Items */}
          <h2 className="mb-2 mt-5 text-subhead font-bold uppercase tracking-wide text-text-2">
            Items
          </h2>
          <div className="flex flex-col gap-2.5">
            {/* Printing files (each file paired with first matching item config) */}
            {order.files.map((file, i) => (
              <PrintItemRow key={file.id} file={file} item={order.items[i] ?? {}} />
            ))}

            {/* Product items (non-file) */}
            {order.items
              .filter((it) => it.productId || (it.name && order.files.length === 0))
              .map((it, i) => (
                <div
                  key={it.productId ?? i}
                  className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3.5"
                >
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-surface-2 text-text-3">
                    <Package size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-subhead font-semibold text-text">{it.name}</p>
                    <p className="text-caption text-text-3">Qty {it.quantity ?? 1}</p>
                  </div>
                  {it.totalPrice != null && (
                    <p className="text-subhead font-bold text-text tnum">{money(it.totalPrice)}</p>
                  )}
                </div>
              ))}
          </div>

          {/* Delivery area */}
          {order.drop.address && (
            <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-border bg-surface p-3.5">
              <MapPin size={18} className="mt-0.5 shrink-0 text-text-3" />
              <div>
                <p className="text-subhead font-semibold text-text">Delivery area</p>
                <p className="text-caption text-text-2">{order.drop.address}</p>
              </div>
            </div>
          )}

          {/* Delivery partner (when assigned) */}
          {order.delivery && (
            <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-border bg-surface p-3.5">
              <Truck size={18} className="mt-0.5 shrink-0 text-text-3" />
              <div>
                <p className="text-subhead font-semibold text-text">Delivery</p>
                <p className="text-caption text-text-2">
                  {order.delivery.providerName ?? 'Partner'} • {order.delivery.status}
                </p>
              </div>
            </div>
          )}

          {/* Pricing */}
          <h2 className="mb-2 mt-5 text-subhead font-bold uppercase tracking-wide text-text-2">
            Price breakdown
          </h2>
          <div className="rounded-xl border border-border bg-surface p-4 text-subhead">
            <Row label="Items" value={money(order.pricing.itemCost)} />
            <Row label="Delivery fee" value={money(order.pricing.deliveryFee)} />
            <div className="my-2 h-px bg-border" />
            <Row label="Total" value={money(order.pricing.totalAmount)} bold />
          </div>
        </div>
      )}

      {/* Sticky actions */}
      {order && (
        <div className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[430px] border-t border-border bg-surface/95 p-4 backdrop-blur-md">
          {order.status === OrderStatus.PAID && (
            <div className="flex gap-2.5">
              <Button
                full
                size="lg"
                loading={accept.isPending}
                onClick={() => action(() => accept.mutateAsync(order.order_id), 'Order accepted')}
              >
                Accept
              </Button>
              <Button
                size="lg"
                variant="secondary"
                loading={reject.isPending}
                onClick={() =>
                  action(() => reject.mutateAsync({ id: order.order_id }), 'Order rejected')
                }
              >
                Reject
              </Button>
            </div>
          )}
          {(order.status === OrderStatus.SELLER_ACCEPTED ||
            order.status === OrderStatus.PREPARING) && (
            <Button
              full
              size="lg"
              loading={markReady.isPending}
              onClick={() =>
                action(() => markReady.mutateAsync(order.order_id), 'Marked ready for pickup')
              }
            >
              Mark Ready for Pickup
            </Button>
          )}
          {![OrderStatus.PAID, OrderStatus.SELLER_ACCEPTED, OrderStatus.PREPARING].includes(
            order.status as never,
          ) && (
            <p className="text-center text-subhead text-text-3">
              No actions available for this order
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className={bold ? 'font-bold text-text' : 'text-text-2'}>{label}</span>
      <span className={`tnum ${bold ? 'text-body font-extrabold text-text' : 'text-text'}`}>
        {value}
      </span>
    </div>
  )
}
