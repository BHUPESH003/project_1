import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  FileText,
  Package,
  User,
  Store,
  CreditCard,
  Truck,
  History,
  ExternalLink,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { Spinner } from '@/components/ui/Spinner'
import { ErrorState } from '@/components/ui/States'
import { Badge } from '@/components/ui/Badge'
import { OrderStatusBadge } from '@/components/orders/OrderStatusBadge'
import { AdminOrderActions } from '@/components/orders/AdminOrderActions'
import { useAdminOrder } from '@/api/hooks/useAdminOrders'
import { money, timeAgo } from '@/lib/format'
import { ORDER_STATUS_LABEL } from '@/lib/constants'
import type { AdminOrderDetail, OrderFile } from '@/types/api'

function maskPhone(phone: string) {
  const last4 = phone.slice(-4)
  return `•••• •••• ${last4}`
}

function Section({
  icon,
  title,
  children,
  action,
}: {
  icon: ReactNode
  title: string
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-title font-semibold text-text">
          <span className="text-text-3">{icon}</span>
          {title}
        </h3>
        {action}
      </div>
      {children}
    </div>
  )
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 text-subhead">
      <span className="text-text-3">{label}</span>
      <span className="text-right text-text">{value ?? '—'}</span>
    </div>
  )
}

function ItemsSection({ order }: { order: AdminOrderDetail }) {
  const payload = order.orderPayload as { items?: Record<string, unknown>[]; notes?: string }
  const items = Array.isArray(payload.items) ? payload.items : []
  return (
    <Section icon={<Package size={18} />} title="Items">
      {items.length > 0 ? (
        <div className="flex flex-col divide-y divide-border-faint">
          {items.map((it, i) => (
            <div key={i} className="flex items-center justify-between gap-3 py-2 text-subhead">
              <span className="text-text">
                {(it.name as string) ?? `Item ${i + 1}`}
                {it.quantity ? <span className="text-text-3"> × {String(it.quantity)}</span> : null}
              </span>
              {it.price != null && <span className="font-medium">{money(it.price as number)}</span>}
            </div>
          ))}
        </div>
      ) : (
        <pre className="overflow-x-auto rounded-md bg-surface-2 p-3 text-caption text-text-2">
          {JSON.stringify(order.orderPayload, null, 2)}
        </pre>
      )}
      {payload.notes && (
        <p className="mt-3 rounded-md bg-surface-2 px-3 py-2 text-subhead text-text-2">
          Note: {payload.notes}
        </p>
      )}
      <div className="mt-4 border-t border-border-faint pt-3">
        <Row label="Item cost" value={money(order.itemCost)} />
        <Row label="Delivery fee" value={money(order.deliveryFee)} />
        <div className="flex items-center justify-between pt-1.5 text-body font-bold text-text">
          <span>Total</span>
          <span>{money(order.totalAmount)}</span>
        </div>
      </div>
    </Section>
  )
}

function FilesSection({ files }: { files: OrderFile[] }) {
  if (files.length === 0) return null
  return (
    <Section icon={<FileText size={18} />} title={`Files (${files.length})`}>
      <div className="flex flex-col gap-2">
        {files.map((f) => (
          <a
            key={f.id}
            href={f.storageUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2.5 text-subhead hover:bg-surface-2"
          >
            <span className="flex items-center gap-2 truncate text-text">
              <FileText size={15} className="shrink-0 text-text-3" />
              <span className="truncate">{f.originalName}</span>
            </span>
            <span className="flex shrink-0 items-center gap-2 text-caption text-text-3">
              {f.pageCount != null && <span>{f.pageCount}p</span>}
              <ExternalLink size={14} />
            </span>
          </a>
        ))}
      </div>
    </Section>
  )
}

function TimelineSection({ order }: { order: AdminOrderDetail }) {
  if (order.stateHistory.length === 0) return null
  return (
    <Section icon={<History size={18} />} title="Status timeline">
      <ol className="relative flex flex-col gap-4 pl-5">
        <span className="absolute left-[5px] top-1.5 h-[calc(100%-12px)] w-px bg-border" />
        {order.stateHistory.map((h) => (
          <li key={h.id} className="relative">
            <span className="absolute -left-5 top-1 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-surface" />
            <div className="flex items-center justify-between gap-2">
              <span className="text-subhead font-medium text-text">
                {ORDER_STATUS_LABEL[h.toStatus] ?? h.toStatus}
              </span>
              <span className="text-caption text-text-3">{timeAgo(h.createdAt)}</span>
            </div>
            <span className="text-caption text-text-3">
              {h.triggeredBy ? `by ${h.triggeredBy}` : 'system'}
              {h.reason ? ` — ${h.reason}` : ''}
            </span>
          </li>
        ))}
      </ol>
    </Section>
  )
}

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: order, isLoading, isError, refetch } = useAdminOrder(id)

  if (isLoading) {
    return (
      <div className="grid place-items-center py-20 text-text-3">
        <Spinner size={28} />
      </div>
    )
  }
  if (isError || !order) {
    return <ErrorState title="Order not found" onRetry={refetch} />
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="tap grid h-9 w-9 place-items-center rounded-md border border-border text-text-2 hover:bg-surface-2"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h1 className="text-title-lg font-bold text-text mono-num">
            #{order.orderId.slice(-6).toUpperCase()}
          </h1>
          <p className="text-subhead text-text-3">Created {timeAgo(order.createdAt)}</p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Left — details */}
        <div className="flex flex-col gap-5 lg:col-span-2">
          <ItemsSection order={order} />
          <FilesSection files={order.files} />
          <TimelineSection order={order} />

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Section
              icon={<Store size={18} />}
              title="Seller"
              action={
                order.seller && (
                  <Link
                    to={`/sellers/${order.seller.id}`}
                    className="text-subhead font-semibold text-primary"
                  >
                    View →
                  </Link>
                )
              }
            >
              {order.seller ? (
                <>
                  <Row label="Shop" value={order.seller.shopName} />
                  <Row label="Address" value={order.seller.address} />
                </>
              ) : (
                <p className="text-subhead text-text-3">No seller assigned.</p>
              )}
            </Section>

            <Section icon={<User size={18} />} title="Customer">
              <Row label="Name" value={order.user.name ?? '—'} />
              <Row label="Phone" value={<span className="mono-num">{maskPhone(order.user.phone)}</span>} />
              <Row label="Delivery" value={order.dropAddress ?? '—'} />
            </Section>

            <Section icon={<CreditCard size={18} />} title="Payment">
              {order.payment ? (
                <>
                  <Row label="Status" value={<Badge tone={order.payment.status === 'SUCCESS' ? 'success' : order.payment.status === 'REFUNDED' ? 'warning' : 'neutral'}>{order.payment.status}</Badge>} />
                  <Row label="Amount" value={money(order.payment.amount)} />
                  <Row label="Method" value={order.payment.method} />
                  <Row label="Gateway ID" value={<span className="mono-num text-caption">{order.payment.gatewayPaymentId ?? '—'}</span>} />
                  {order.payment.refundAmount != null && (
                    <Row label="Refund" value={money(order.payment.refundAmount)} />
                  )}
                </>
              ) : (
                <p className="text-subhead text-text-3">No payment recorded.</p>
              )}
            </Section>

            <Section icon={<Truck size={18} />} title="Delivery">
              {order.delivery ? (
                <>
                  <Row label="Provider" value={order.delivery.providerName ?? '—'} />
                  <Row label="Status" value={order.delivery.status} />
                  <Row label="Task ID" value={<span className="mono-num text-caption">{order.delivery.providerTaskId ?? '—'}</span>} />
                  {order.delivery.providerTrackingUrl && (
                    <Row
                      label="Tracking"
                      value={
                        <a
                          href={order.delivery.providerTrackingUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-primary"
                        >
                          Open <ExternalLink size={13} />
                        </a>
                      }
                    />
                  )}
                </>
              ) : (
                <p className="text-subhead text-text-3">No delivery assigned.</p>
              )}
            </Section>
          </div>
        </div>

        {/* Right — sticky actions */}
        <div className="lg:col-span-1">
          <div className="lg:sticky lg:top-2">
            <AdminOrderActions order={order} />
          </div>
        </div>
      </div>
    </div>
  )
}
