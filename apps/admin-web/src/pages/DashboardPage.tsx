import { useNavigate } from 'react-router-dom'
import {
  ShoppingBag,
  IndianRupee,
  Store,
  UserCheck,
  AlertTriangle,
  Clock,
  PackageX,
  ChevronRight,
} from 'lucide-react'
import { OrderStatus } from '@repo/types'
import { StatCard } from '@/components/shared/StatCard'
import { Table, type Column } from '@/components/ui/Table'
import { OrderStatusBadge } from '@/components/orders/OrderStatusBadge'
import { useAnalyticsOverview } from '@/api/hooks/useAnalytics'
import { useAdminOrders } from '@/api/hooks/useAdminOrders'
import { useAdminSellers } from '@/api/hooks/useAdminSellers'
import { money, timeAgo, formatPhone } from '@/lib/format'
import { STALE_ORDER_MINUTES } from '@/lib/constants'
import { countStalePaidOrders } from '@/lib/orders'
import type { AdminOrderRow } from '@/types/api'

function shortId(id: string) {
  return `#${id.slice(-6).toUpperCase()}`
}

export function DashboardPage() {
  const navigate = useNavigate()
  const overview = useAnalyticsOverview()
  const recent = useAdminOrders({ page: 1, limit: 10 })
  const pending = useAdminSellers({ isVerified: false, limit: 1 })

  const ov = overview.data
  const pendingCount = pending.data?.total ?? 0

  // Stale orders: PAID with no seller action for > STALE_ORDER_MINUTES (client-side).
  const rows = recent.data?.rows ?? []
  const staleCount = countStalePaidOrders(rows)
  const failedCount = ov?.orders.byStatus?.[OrderStatus.DELIVERY_FAILED] ?? 0
  const ordersToday = ov ? ov.orders.byStatus[OrderStatus.DELIVERED] ?? 0 : 0

  const columns: Column<AdminOrderRow>[] = [
    { key: 'orderId', header: 'Order', width: '110px', render: (o) => (
      <span className="mono-num font-semibold text-text">{shortId(o.orderId)}</span>
    ) },
    { key: 'status', header: 'Status', render: (o) => <OrderStatusBadge status={o.status} /> },
    { key: 'seller', header: 'Seller', render: (o) => o.seller?.shopName ?? <span className="text-text-3">Unassigned</span> },
    { key: 'category', header: 'Category', render: (o) => o.category?.name ?? '—' },
    { key: 'customer', header: 'Customer', render: (o) => (
      <span className="mono-num text-text-2">{formatPhone(o.user.phone)}</span>
    ) },
    { key: 'totalAmount', header: 'Amount', align: 'right', render: (o) => (
      <span className="font-semibold">{money(o.totalAmount)}</span>
    ) },
    { key: 'createdAt', header: 'Created', align: 'right', render: (o) => (
      <span className="text-text-3">{timeAgo(o.createdAt)}</span>
    ) },
  ]

  const attention: { icon: typeof Clock; label: string; to: string; tone: string }[] = []
  if (pendingCount > 0)
    attention.push({
      icon: UserCheck,
      label: `${pendingCount} seller${pendingCount > 1 ? 's' : ''} awaiting approval`,
      to: '/sellers?tab=pending',
      tone: 'text-warning',
    })
  if (staleCount > 0)
    attention.push({
      icon: Clock,
      label: `${staleCount} order${staleCount > 1 ? 's' : ''} PAID for >${STALE_ORDER_MINUTES} min with no seller action`,
      to: `/orders?status=${OrderStatus.PAID}`,
      tone: 'text-warning',
    })
  if (failedCount > 0)
    attention.push({
      icon: PackageX,
      label: `${failedCount} failed deliver${failedCount > 1 ? 'ies' : 'y'}`,
      to: `/orders?status=${OrderStatus.DELIVERY_FAILED}`,
      tone: 'text-danger',
    })

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-title-lg font-bold text-text">Dashboard</h1>
        <p className="text-subhead text-text-2">Operations overview</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Delivered today"
          value={ordersToday}
          icon={<ShoppingBag size={18} />}
          loading={overview.isLoading}
        />
        <StatCard
          label="Revenue today"
          value={money(ov?.revenue.today ?? 0)}
          icon={<IndianRupee size={18} />}
          hint={ov ? `${money(ov.revenue.thisMonth)} this month` : undefined}
          loading={overview.isLoading}
        />
        <StatCard
          label="Active sellers"
          value={ov ? `${ov.sellers.active} / ${ov.sellers.total}` : '—'}
          icon={<Store size={18} />}
          hint="online / total"
          loading={overview.isLoading}
        />
        <StatCard
          label="Pending approvals"
          value={pendingCount}
          icon={<UserCheck size={18} />}
          loading={pending.isLoading}
          accent={pendingCount > 0 ? 'warning' : 'default'}
        />
      </div>

      {/* Attention required */}
      {attention.length > 0 && (
        <div className="rounded-xl border border-warning/40 bg-warning-soft p-5">
          <div className="flex items-center gap-2 text-title font-semibold text-text">
            <AlertTriangle size={18} className="text-warning" /> Attention required
          </div>
          <ul className="mt-3 flex flex-col gap-2">
            {attention.map((a, i) => {
              const Icon = a.icon
              return (
                <li key={i}>
                  <button
                    onClick={() => navigate(a.to)}
                    className="flex w-full items-center gap-2.5 rounded-lg bg-surface/70 px-3.5 py-2.5 text-left text-subhead text-text hover:bg-surface"
                  >
                    <Icon size={16} className={a.tone} />
                    <span className="flex-1">{a.label}</span>
                    <ChevronRight size={16} className="text-text-3" />
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/* Recent orders */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-title font-semibold text-text">Recent orders</h2>
          <button
            onClick={() => navigate('/orders')}
            className="inline-flex items-center gap-0.5 text-subhead font-semibold text-primary"
          >
            View all <ChevronRight size={15} />
          </button>
        </div>
        <Table<AdminOrderRow>
          columns={columns}
          data={rows}
          rowKey={(o) => o.orderId}
          loading={recent.isLoading}
          error={recent.isError}
          onRetry={recent.refetch}
          emptyTitle="No orders yet"
          onRowClick={(o) => navigate(`/orders/${o.orderId}`)}
          skeletonRows={6}
        />
      </div>
    </div>
  )
}
