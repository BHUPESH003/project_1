import { useState } from 'react'
import { UserCog, Truck, XCircle } from 'lucide-react'
import { OrderStatus, DeliveryProvider } from '@repo/types'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { useAdminSellers } from '@/api/hooks/useAdminSellers'
import {
  useReassignSeller,
  useReassignDelivery,
  useCancelOrder,
} from '@/api/hooks/useAdminOrders'
import { getErrorMessage } from '@/api/client'
import { toast } from '@/stores/toastStore'
import { TERMINAL_ORDER_STATUSES } from '@/lib/constants'
import { money } from '@/lib/format'
import type { AdminOrderDetail } from '@/types/api'

/** Sticky panel of context-aware admin interventions for an order. */
export function AdminOrderActions({ order }: { order: AdminOrderDetail }) {
  const [reassignOpen, setReassignOpen] = useState(false)
  const [deliveryOpen, setDeliveryOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)

  const isTerminal = TERMINAL_ORDER_STATUSES.includes(order.status)
  const canReassignSeller =
    order.status === OrderStatus.PAID ||
    order.status === OrderStatus.SELLER_SELECTED ||
    order.status === OrderStatus.SELLER_REJECTED
  const canRetryDelivery = order.status === OrderStatus.DELIVERY_FAILED

  const actions: { key: string; label: string; icon: typeof UserCog; onClick: () => void; variant?: 'secondary' | 'danger' }[] = []
  if (canReassignSeller)
    actions.push({ key: 'rs', label: 'Reassign seller', icon: UserCog, onClick: () => setReassignOpen(true), variant: 'secondary' })
  if (canRetryDelivery)
    actions.push({ key: 'rd', label: 'Retry delivery', icon: Truck, onClick: () => setDeliveryOpen(true), variant: 'secondary' })
  if (!isTerminal)
    actions.push({ key: 'cx', label: 'Cancel order', icon: XCircle, onClick: () => setCancelOpen(true), variant: 'danger' })

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <h3 className="text-title font-semibold text-text">Admin actions</h3>
      {actions.length === 0 ? (
        <p className="mt-3 text-subhead text-text-2">
          No interventions available for a {isTerminal ? 'completed' : 'this'} order.
        </p>
      ) : (
        <div className="mt-4 flex flex-col gap-2">
          {actions.map((a) => {
            const Icon = a.icon
            return (
              <Button
                key={a.key}
                full
                variant={a.variant}
                icon={<Icon size={16} />}
                onClick={a.onClick}
              >
                {a.label}
              </Button>
            )
          })}
        </div>
      )}

      <ReassignSellerModal order={order} open={reassignOpen} onOpenChange={setReassignOpen} />
      <ReassignDeliveryModal order={order} open={deliveryOpen} onOpenChange={setDeliveryOpen} />
      <CancelOrderModal order={order} open={cancelOpen} onOpenChange={setCancelOpen} />
    </div>
  )
}

/* ── Reassign seller ─────────────────────────────────────────────────────── */

function ReassignSellerModal({
  order,
  open,
  onOpenChange,
}: {
  order: AdminOrderDetail
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const [search, setSearch] = useState('')
  const [sellerId, setSellerId] = useState('')
  const [reason, setReason] = useState('')
  const reassign = useReassignSeller()
  const { data } = useAdminSellers({ status: 'ONLINE', search: search || undefined, limit: 50 })
  const sellers = data?.sellers ?? []

  async function submit() {
    if (!sellerId || !reason.trim()) return
    try {
      await reassign.mutateAsync({ id: order.orderId, vars: { sellerId, reason: reason.trim() } })
      toast.success('Seller reassigned')
      onOpenChange(false)
      setSellerId('')
      setReason('')
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Reassign seller"
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button loading={reassign.isPending} disabled={!sellerId || !reason.trim()} onClick={submit}>
            Reassign
          </Button>
        </>
      }
    >
      <Field
        label="Search online sellers"
        placeholder="Shop name or phone"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="mt-3 max-h-56 overflow-y-auto rounded-md border border-border">
        {sellers.length === 0 ? (
          <p className="px-3 py-4 text-center text-subhead text-text-3">No online sellers found.</p>
        ) : (
          sellers.map((s) => (
            <button
              key={s.id}
              onClick={() => setSellerId(s.id)}
              className={
                'flex w-full items-center justify-between gap-2 border-b border-border-faint px-3 py-2.5 text-left last:border-b-0 ' +
                (sellerId === s.id ? 'bg-primary-soft' : 'hover:bg-surface-2')
              }
            >
              <span className="text-subhead font-medium text-text">{s.shopName}</span>
              <span className="mono-num text-caption text-text-3">{s.user?.phone ?? ''}</span>
            </button>
          ))
        )}
      </div>
      <label className="mt-4 flex flex-col gap-1.5">
        <span className="text-subhead font-medium text-text-2">Reason</span>
        <textarea
          rows={2}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Why is this order being reassigned?"
          className="resize-none rounded-md border-[1.5px] border-border bg-surface px-3 py-2 text-body text-text outline-none placeholder:text-text-3 focus:border-primary focus:shadow-[0_0_0_3px_var(--primary-soft)]"
        />
      </label>
    </Modal>
  )
}

/* ── Reassign / retry delivery ───────────────────────────────────────────── */

function ReassignDeliveryModal({
  order,
  open,
  onOpenChange,
}: {
  order: AdminOrderDetail
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const [provider, setProvider] = useState<string>(DeliveryProvider.DUNZO)
  const [trackingId, setTrackingId] = useState('')
  const reassign = useReassignDelivery()

  async function submit() {
    if (!trackingId.trim()) return
    try {
      await reassign.mutateAsync({
        id: order.orderId,
        vars: { provider: provider as DeliveryProvider, trackingId: trackingId.trim() },
      })
      toast.success('Delivery reassigned')
      onOpenChange(false)
      setTrackingId('')
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Reassign delivery"
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button loading={reassign.isPending} disabled={!trackingId.trim()} onClick={submit}>
            Reassign delivery
          </Button>
        </>
      }
    >
      <Select
        label="Provider"
        value={provider}
        options={Object.values(DeliveryProvider).map((p) => ({ value: p, label: p }))}
        onChange={(e) => setProvider(e.target.value)}
      />
      <div className="mt-3">
        <Field
          label="Tracking ID"
          placeholder="Provider tracking / task ID"
          value={trackingId}
          onChange={(e) => setTrackingId(e.target.value)}
        />
      </div>
    </Modal>
  )
}

/* ── Cancel (with optional refund) ───────────────────────────────────────── */

function CancelOrderModal({
  order,
  open,
  onOpenChange,
}: {
  order: AdminOrderDetail
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const cancel = useCancelOrder()
  const [refund, setRefund] = useState<string>(
    order.totalAmount != null ? String(order.totalAmount) : '',
  )

  return (
    <ConfirmModal
      open={open}
      onOpenChange={onOpenChange}
      title="Cancel order"
      danger
      confirmLabel="Cancel order"
      cancelLabel="Keep order"
      requireReason
      reasonLabel="Cancellation reason"
      message={
        <>
          This will cancel order <b className="text-text">#{order.orderId.slice(-6).toUpperCase()}</b>{' '}
          and process any refund below. This cannot be undone.
        </>
      }
      onConfirm={async (reason) => {
        const refundAmount = refund.trim() ? Number(refund) : undefined
        await cancel.mutateAsync({
          id: order.orderId,
          vars: { reason, refundAmount },
        })
        toast.success('Order cancelled')
      }}
    >
      <label className="flex flex-col gap-1.5">
        <span className="text-subhead font-medium text-text-2">
          Refund amount (order total {money(order.totalAmount)})
        </span>
        <Field
          type="number"
          value={refund}
          onChange={(e) => setRefund(e.target.value)}
          placeholder="0"
          leading={<span className="text-text-3">₹</span>}
        />
      </label>
    </ConfirmModal>
  )
}
