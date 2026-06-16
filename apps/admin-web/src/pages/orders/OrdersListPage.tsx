import { useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { X } from 'lucide-react'
import { OrderStatus } from '@repo/types'
import { Table, type Column, type SortState } from '@/components/ui/Table'
import { Select } from '@/components/ui/Select'
import { Field } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { OrderStatusBadge } from '@/components/orders/OrderStatusBadge'
import { useAdminOrders } from '@/api/hooks/useAdminOrders'
import { money, timeAgo, formatPhone } from '@/lib/format'
import { ORDER_STATUS_LABEL, PAGE_SIZE } from '@/lib/constants'
import type { AdminOrderRow } from '@/types/api'

function shortId(id: string) {
  return `#${id.slice(-6).toUpperCase()}`
}

const STATUS_OPTIONS = Object.values(OrderStatus).map((s) => ({
  value: s,
  label: ORDER_STATUS_LABEL[s],
}))

const DATE_PRESETS = [
  { key: 'today', label: 'Today', days: 0 },
  { key: '7d', label: 'Last 7 days', days: 7 },
  { key: '30d', label: 'Last 30 days', days: 30 },
]

function presetStart(days: number): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  if (days > 0) d.setDate(d.getDate() - days)
  return d.toISOString()
}

export function OrdersListPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()

  const status = params.get('status') ?? ''
  const sellerId = params.get('sellerId') ?? ''
  const startDate = params.get('from') ?? ''
  const activePreset = params.get('preset') ?? ''
  const page = Number(params.get('page') ?? '1')
  const sortKey = params.get('sort') ?? 'createdAt'
  const sortDir = (params.get('dir') ?? 'desc') as 'asc' | 'desc'

  const { data, isLoading, isError, refetch } = useAdminOrders({
    status: status || undefined,
    sellerId: sellerId || undefined,
    startDate: startDate || undefined,
    page,
    limit: PAGE_SIZE,
  })

  function update(next: Record<string, string | null>) {
    const p = new URLSearchParams(params)
    for (const [k, v] of Object.entries(next)) {
      if (v == null || v === '') p.delete(k)
      else p.set(k, v)
    }
    // Any filter change resets to page 1 unless page itself is being set.
    if (!('page' in next)) p.set('page', '1')
    setParams(p, { replace: true })
  }

  const sort: SortState = { key: sortKey, dir: sortDir }
  // Backend sorts createdAt desc; we sort the current page client-side so the
  // sortable headers behave for Created and Amount.
  const rows = useMemo(() => {
    const list = [...(data?.rows ?? [])]
    list.sort((a, b) => {
      const cmp =
        sortKey === 'totalAmount'
          ? (a.totalAmount ?? 0) - (b.totalAmount ?? 0)
          : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      return sortDir === 'asc' ? cmp : -cmp
    })
    return list
  }, [data?.rows, sortKey, sortDir])

  const hasFilters = status || sellerId || startDate

  const columns: Column<AdminOrderRow>[] = [
    {
      key: 'orderId',
      header: 'Order',
      width: '110px',
      render: (o) => <span className="mono-num font-semibold text-text">{shortId(o.orderId)}</span>,
    },
    { key: 'status', header: 'Status', render: (o) => <OrderStatusBadge status={o.status} /> },
    {
      key: 'seller',
      header: 'Seller',
      render: (o) => o.seller?.shopName ?? <span className="text-text-3">Unassigned</span>,
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (o) => <span className="mono-num text-text-2">{formatPhone(o.user.phone)}</span>,
    },
    { key: 'category', header: 'Category', render: (o) => o.category?.name ?? '—' },
    {
      key: 'totalAmount',
      header: 'Amount',
      align: 'right',
      sortable: true,
      render: (o) => <span className="font-semibold">{money(o.totalAmount)}</span>,
    },
    {
      key: 'createdAt',
      header: 'Created',
      align: 'right',
      sortable: true,
      render: (o) => <span className="text-text-3">{timeAgo(o.createdAt)}</span>,
    },
  ]

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-title-lg font-bold text-text">Orders</h1>
        <p className="text-subhead text-text-2">
          {data ? `${data.pagination.total} orders` : 'All orders'}
        </p>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-surface p-4">
        <div className="w-48">
          <Select
            label="Status"
            value={status}
            placeholder="All statuses"
            options={STATUS_OPTIONS}
            onChange={(e) => update({ status: e.target.value })}
          />
        </div>
        <div className="w-52">
          <Field
            label="Seller ID"
            value={sellerId}
            placeholder="Filter by seller ID"
            onChange={(e) => update({ sellerId: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-[7px]">
          <span className="text-subhead font-medium text-text-2">Date range</span>
          <div className="flex gap-1.5">
            {DATE_PRESETS.map((p) => (
              <button
                key={p.key}
                onClick={() =>
                  update({ from: presetStart(p.days), preset: p.key })
                }
                className={
                  'rounded-md border px-3 py-2 text-subhead font-medium transition-colors ' +
                  (activePreset === p.key
                    ? 'border-primary bg-primary-soft text-on-primary-soft'
                    : 'border-border text-text-2 hover:bg-surface-2')
                }
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            icon={<X size={15} />}
            onClick={() => setParams({}, { replace: true })}
          >
            Clear
          </Button>
        )}
      </div>

      <Table<AdminOrderRow>
        columns={columns}
        data={rows}
        rowKey={(o) => o.orderId}
        loading={isLoading}
        error={isError}
        onRetry={refetch}
        emptyTitle="No orders match these filters"
        onRowClick={(o) => navigate(`/orders/${o.orderId}`)}
        sort={sort}
        onSortChange={(s) => update({ sort: s.key, dir: s.dir, page: page.toString() })}
        pagination={{
          page,
          totalPages: data?.pagination.totalPages ?? 1,
          total: data?.pagination.total,
          onPageChange: (p) => update({ page: p.toString() }),
        }}
      />
    </div>
  )
}
