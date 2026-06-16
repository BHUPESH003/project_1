import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Search } from 'lucide-react'
import { SellerStatus } from '@repo/types'
import { Table, type Column } from '@/components/ui/Table'
import { Button } from '@/components/ui/Button'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { SellerStatusBadge, SellerFlags } from '@/components/sellers/SellerBadges'
import {
  useAdminSellers,
  useVerifySeller,
  useSuspendSeller,
  useUnsuspendSeller,
  type SellerFilters,
} from '@/api/hooks/useAdminSellers'
import { toast } from '@/stores/toastStore'
import { getErrorMessage } from '@/api/client'
import { formatPhone, timeAgo } from '@/lib/format'
import { PAGE_SIZE } from '@/lib/constants'
import type { AdminSeller } from '@/types/api'

type Tab = 'all' | 'pending' | 'online' | 'offline' | 'suspended'

const TABS: { key: Tab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'online', label: 'Online' },
  { key: 'offline', label: 'Offline' },
  { key: 'suspended', label: 'Suspended' },
]

function tabFilters(tab: Tab): Partial<SellerFilters> {
  switch (tab) {
    case 'pending':
      return { isVerified: false }
    case 'online':
      return { status: SellerStatus.ONLINE }
    case 'offline':
      return { status: SellerStatus.OFFLINE }
    case 'suspended':
      return { isSuspended: true }
    default:
      return {}
  }
}

export function SellersListPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') ?? 'all') as Tab
  const page = Number(params.get('page') ?? '1')
  const search = params.get('search') ?? ''

  const [suspendTarget, setSuspendTarget] = useState<AdminSeller | null>(null)

  const verify = useVerifySeller()
  const suspend = useSuspendSeller()
  const unsuspend = useUnsuspendSeller()

  const { data, isLoading, isError, refetch } = useAdminSellers({
    ...tabFilters(tab),
    search: search || undefined,
    page,
    limit: PAGE_SIZE,
  })

  function setTab(next: Tab) {
    const p = new URLSearchParams(params)
    p.set('tab', next)
    p.set('page', '1')
    setParams(p, { replace: true })
  }

  function setSearch(value: string) {
    const p = new URLSearchParams(params)
    if (value) p.set('search', value)
    else p.delete('search')
    p.set('page', '1')
    setParams(p, { replace: true })
  }

  async function approve(s: AdminSeller) {
    try {
      await verify.mutateAsync({ id: s.id, vars: undefined })
      toast.success(`${s.shopName} approved`)
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  async function doUnsuspend(s: AdminSeller) {
    try {
      await unsuspend.mutateAsync({ id: s.id, vars: undefined })
      toast.success(`${s.shopName} unsuspended`)
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  const columns: Column<AdminSeller>[] = [
    {
      key: 'shopName',
      header: 'Shop',
      render: (s) => <span className="font-semibold text-text">{s.shopName}</span>,
    },
    {
      key: 'phone',
      header: 'Owner',
      render: (s) => (
        <span className="mono-num text-text-2">
          {s.user?.phone ? formatPhone(s.user.phone) : '—'}
        </span>
      ),
    },
    { key: 'status', header: 'Status', render: (s) => <SellerStatusBadge status={s.status} /> },
    { key: 'flags', header: 'Flags', render: (s) => <SellerFlags seller={s} /> },
    {
      key: 'joined',
      header: 'Joined',
      align: 'right',
      render: (s) => <span className="text-text-3">{timeAgo(s.createdAt)}</span>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: '180px',
      render: (s) => (
        <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
          {!s.isVerified && (
            <Button
              size="sm"
              variant="primary"
              loading={verify.isPending && verify.variables?.id === s.id}
              onClick={() => approve(s)}
            >
              Approve
            </Button>
          )}
          {s.isSuspended ? (
            <Button
              size="sm"
              variant="secondary"
              loading={unsuspend.isPending && unsuspend.variables?.id === s.id}
              onClick={() => doUnsuspend(s)}
            >
              Unsuspend
            </Button>
          ) : (
            <Button size="sm" variant="danger" onClick={() => setSuspendTarget(s)}>
              Suspend
            </Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-title-lg font-bold text-text">Sellers</h1>
        <p className="text-subhead text-text-2">{data ? `${data.total} sellers` : 'Manage sellers'}</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Tabs */}
        <div className="flex gap-1 rounded-lg border border-border bg-surface p-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={
                'rounded-md px-3.5 py-1.5 text-subhead font-medium transition-colors ' +
                (tab === t.key ? 'bg-primary text-on-primary' : 'text-text-2 hover:bg-surface-2')
              }
            >
              {t.label}
            </button>
          ))}
        </div>
        {/* Search */}
        <div className="relative w-64">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-3" />
          <input
            defaultValue={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search shop or phone…"
            className="h-10 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-subhead text-text outline-none placeholder:text-text-3 focus:border-primary focus:shadow-[0_0_0_3px_var(--primary-soft)]"
          />
        </div>
      </div>

      <Table<AdminSeller>
        columns={columns}
        data={data?.sellers}
        rowKey={(s) => s.id}
        loading={isLoading}
        error={isError}
        onRetry={refetch}
        emptyTitle="No sellers found"
        onRowClick={(s) => navigate(`/sellers/${s.id}`)}
        pagination={{
          page,
          totalPages: data?.totalPages ?? 1,
          total: data?.total,
          onPageChange: (p) => {
            const sp = new URLSearchParams(params)
            sp.set('page', p.toString())
            setParams(sp, { replace: true })
          },
        }}
      />

      <ConfirmModal
        open={!!suspendTarget}
        onOpenChange={(o) => !o && setSuspendTarget(null)}
        title="Suspend seller"
        danger
        confirmLabel="Suspend"
        message={
          suspendTarget ? (
            <>
              Suspend <b className="text-text">{suspendTarget.shopName}</b>? They will be set
              offline and blocked from taking orders.
            </>
          ) : null
        }
        onConfirm={async () => {
          if (!suspendTarget) return
          await suspend.mutateAsync({ id: suspendTarget.id, vars: undefined })
          toast.success(`${suspendTarget.shopName} suspended`)
          setSuspendTarget(null)
        }}
      />
    </div>
  )
}
