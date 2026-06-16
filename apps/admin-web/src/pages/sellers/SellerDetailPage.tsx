import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Store, Pencil, MapPin, Phone } from 'lucide-react'
import { SellerStatus } from '@repo/types'
import { Spinner } from '@/components/ui/Spinner'
import { ErrorState, EmptyState } from '@/components/ui/States'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Select } from '@/components/ui/Select'
import { Switch } from '@/components/ui/Switch'
import { Modal } from '@/components/ui/Modal'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { Table, type Column } from '@/components/ui/Table'
import { StatCard } from '@/components/shared/StatCard'
import { Badge } from '@/components/ui/Badge'
import { SellerStatusBadge, SellerFlags } from '@/components/sellers/SellerBadges'
import { OrderStatusBadge } from '@/components/orders/OrderStatusBadge'
import {
  useAdminSeller,
  useSellerProducts,
  useVerifySeller,
  useUnverifySeller,
  useSuspendSeller,
  useUnsuspendSeller,
  useUpdateSeller,
} from '@/api/hooks/useAdminSellers'
import { useAdminOrders } from '@/api/hooks/useAdminOrders'
import { toast } from '@/stores/toastStore'
import { getErrorMessage } from '@/api/client'
import { money, formatPhone, timeAgo, assetUrl } from '@/lib/format'
import type { AdminOrderRow, AdminSellerDetail, Product } from '@/types/api'

export function SellerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: seller, isLoading, isError, refetch } = useAdminSeller(id)
  const orders = useAdminOrders({ sellerId: id, limit: 20 })
  const products = useSellerProducts(id)

  const verify = useVerifySeller()
  const unverify = useUnverifySeller()
  const suspend = useSuspendSeller()
  const unsuspend = useUnsuspendSeller()
  const update = useUpdateSeller()

  const [editOpen, setEditOpen] = useState(false)
  const [suspendOpen, setSuspendOpen] = useState(false)

  if (isLoading) {
    return (
      <div className="grid place-items-center py-20 text-text-3">
        <Spinner size={28} />
      </div>
    )
  }
  if (isError || !seller) return <ErrorState title="Seller not found" onRetry={refetch} />

  const s = seller
  const completionRate =
    s.stats.totalOrders > 0
      ? Math.round((s.stats.completedOrders / s.stats.totalOrders) * 100)
      : 0

  async function run(fn: () => Promise<unknown>, msg: string) {
    try {
      await fn()
      toast.success(msg)
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  const orderColumns: Column<AdminOrderRow>[] = [
    {
      key: 'orderId',
      header: 'Order',
      width: '110px',
      render: (o) => <span className="mono-num font-semibold">#{o.orderId.slice(-6).toUpperCase()}</span>,
    },
    { key: 'status', header: 'Status', render: (o) => <OrderStatusBadge status={o.status} /> },
    { key: 'amount', header: 'Amount', align: 'right', render: (o) => money(o.totalAmount) },
    {
      key: 'createdAt',
      header: 'Created',
      align: 'right',
      render: (o) => <span className="text-text-3">{timeAgo(o.createdAt)}</span>,
    },
  ]

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
        <h1 className="flex-1 text-title-lg font-bold text-text">{s.shopName}</h1>
        <Button variant="secondary" size="sm" icon={<Pencil size={15} />} onClick={() => setEditOpen(true)}>
          Edit profile
        </Button>
      </div>

      {/* Header card */}
      <div className="flex flex-wrap items-start gap-4 rounded-xl border border-border bg-surface p-5">
        <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-surface-2 text-text-3">
          {assetUrl(s.imagePath) ? (
            <img src={assetUrl(s.imagePath)} alt={s.shopName} className="h-full w-full object-cover" />
          ) : (
            <Store size={26} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <SellerStatusBadge status={s.status} />
            <SellerFlags seller={s} />
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-subhead text-text-2">
            <Phone size={14} /> <span className="mono-num">{s.user?.phone ? formatPhone(s.user.phone) : '—'}</span>
          </p>
          <p className="mt-1 flex items-start gap-1.5 text-subhead text-text-2">
            <MapPin size={14} className="mt-0.5 shrink-0" /> {s.address}
          </p>
          {s.categories && s.categories.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {s.categories.map((c) => (
                <Badge key={c.category.id} tone="neutral">
                  {c.category.name}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Total orders" value={s.stats.totalOrders} />
        <StatCard label="Completed" value={s.stats.completedOrders} />
        <StatCard label="Revenue" value={money(s.stats.totalRevenue)} />
        <StatCard label="Completion rate" value={`${completionRate}%`} />
      </div>

      {/* Admin actions */}
      <div className="flex flex-wrap gap-2 rounded-xl border border-border bg-surface p-4">
        {s.isVerified ? (
          <Button
            variant="secondary"
            size="sm"
            loading={unverify.isPending}
            onClick={() => run(() => unverify.mutateAsync({ id: s.id, vars: undefined }), 'Verification removed')}
          >
            Unverify
          </Button>
        ) : (
          <Button
            size="sm"
            loading={verify.isPending}
            onClick={() => run(() => verify.mutateAsync({ id: s.id, vars: undefined }), 'Seller verified')}
          >
            Verify
          </Button>
        )}
        {s.isSuspended ? (
          <Button
            variant="secondary"
            size="sm"
            loading={unsuspend.isPending}
            onClick={() => run(() => unsuspend.mutateAsync({ id: s.id, vars: undefined }), 'Seller unsuspended')}
          >
            Unsuspend
          </Button>
        ) : (
          <Button variant="danger" size="sm" onClick={() => setSuspendOpen(true)}>
            Suspend
          </Button>
        )}
        <div className="ml-auto flex items-center gap-2.5">
          <span className="text-subhead font-medium text-text-2">Trending</span>
          <Switch
            checked={s.isTrending}
            onCheckedChange={(checked) =>
              run(
                () => update.mutateAsync({ id: s.id, vars: { isTrending: checked } }),
                checked ? 'Marked trending' : 'Removed from trending',
              )
            }
          />
        </div>
      </div>

      {/* Recent orders */}
      <div>
        <h2 className="mb-3 text-title font-semibold text-text">Recent orders</h2>
        <Table<AdminOrderRow>
          columns={orderColumns}
          data={orders.data?.rows}
          rowKey={(o) => o.orderId}
          loading={orders.isLoading}
          error={orders.isError}
          onRetry={orders.refetch}
          emptyTitle="No orders yet"
          onRowClick={(o) => navigate(`/orders/${o.orderId}`)}
          skeletonRows={5}
        />
      </div>

      {/* Products */}
      <div>
        <h2 className="mb-3 text-title font-semibold text-text">Products</h2>
        {products.isLoading ? (
          <div className="grid place-items-center py-8 text-text-3">
            <Spinner />
          </div>
        ) : !products.data || products.data.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface">
            <EmptyState title="No products" description="This seller has not listed any products." />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {products.data.map((p: Product) => (
              <div key={p.id} className="rounded-xl border border-border bg-surface p-3">
                <div className="mb-2 aspect-square overflow-hidden rounded-lg bg-surface-2">
                  {assetUrl(p.image) && (
                    <img src={assetUrl(p.image)} alt={p.name} className="h-full w-full object-cover" />
                  )}
                </div>
                <p className="truncate text-subhead font-medium text-text">{p.name}</p>
                <div className="mt-1 flex items-center justify-between">
                  <span className="font-semibold text-text">{money(p.price)}</span>
                  <Badge tone={p.inStock ? 'success' : 'neutral'}>{p.inStock ? 'In stock' : 'Out'}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <EditSellerModal seller={s} open={editOpen} onOpenChange={setEditOpen} />

      <ConfirmModal
        open={suspendOpen}
        onOpenChange={setSuspendOpen}
        title="Suspend seller"
        danger
        confirmLabel="Suspend"
        message={
          <>
            Suspend <b className="text-text">{s.shopName}</b>? They will be set offline and blocked
            from taking orders.
          </>
        }
        onConfirm={async () => {
          await suspend.mutateAsync({ id: s.id, vars: undefined })
          toast.success('Seller suspended')
        }}
      />
    </div>
  )
}

/* ── Edit modal (only the 4 backend-persisted fields) ────────────────────── */

function EditSellerModal({
  seller,
  open,
  onOpenChange,
}: {
  seller: AdminSellerDetail
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const update = useUpdateSeller()
  const [shopName, setShopName] = useState(seller.shopName)
  const [address, setAddress] = useState(seller.address)
  const [status, setStatus] = useState<string>(seller.status)

  async function save() {
    try {
      await update.mutateAsync({
        id: seller.id,
        vars: { shopName, address, status: status as SellerStatus },
      })
      toast.success('Seller updated')
      onOpenChange(false)
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Edit seller profile"
      description="Only these fields are editable from admin."
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button loading={update.isPending} onClick={save}>
            Save changes
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Shop name" value={shopName} onChange={(e) => setShopName(e.target.value)} />
        <Field label="Address" value={address} onChange={(e) => setAddress(e.target.value)} />
        <Select
          label="Status"
          value={status}
          options={[
            { value: SellerStatus.ONLINE, label: 'Online' },
            { value: SellerStatus.OFFLINE, label: 'Offline' },
          ]}
          onChange={(e) => setStatus(e.target.value)}
        />
      </div>
    </Modal>
  )
}
