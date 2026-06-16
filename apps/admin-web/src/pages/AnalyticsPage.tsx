import { useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { BarChart3, TrendingUp } from 'lucide-react'
import { Select } from '@/components/ui/Select'
import { StatCard } from '@/components/shared/StatCard'
import { Table, type Column } from '@/components/ui/Table'
import { useOrdersAnalytics, useSellersAnalytics } from '@/api/hooks/useAnalytics'
import { money } from '@/lib/format'
import {
  presetRange,
  formatPeriod,
  DEFAULT_GRANULARITY,
  type RangePreset,
} from '@/lib/dates'
import type { AnalyticsGranularity, SellersAnalytics } from '@/types/api'

const PRESETS: { key: RangePreset; label: string }[] = [
  { key: '7d', label: 'Last 7 days' },
  { key: '30d', label: 'Last 30 days' },
  { key: 'month', label: 'This month' },
]

const CHART_GRID = 'var(--border)'
const TEAL = '#0D9488'
const BLUE = '#3B82F6'

function ChartEmpty({ label }: { label: string }) {
  return (
    <div className="grid h-[260px] place-items-center text-text-3">
      <div className="flex flex-col items-center gap-2">
        <BarChart3 size={28} />
        <span className="text-subhead">{label}</span>
      </div>
    </div>
  )
}

export function AnalyticsPage() {
  const [tab, setTab] = useState<'overview' | 'sellers'>('overview')
  const [preset, setPreset] = useState<RangePreset>('month')
  const [granularity, setGranularity] = useState<AnalyticsGranularity>(DEFAULT_GRANULARITY)

  const range = useMemo(() => presetRange(preset), [preset])
  const orders = useOrdersAnalytics({ ...range, granularity })
  const sellers = useSellersAnalytics(10)

  const chartData = useMemo(
    () =>
      (orders.data?.ordersOverTime ?? []).map((p) => ({
        period: formatPeriod(p.period, granularity),
        orders: p.count,
        revenue: p.revenue,
      })),
    [orders.data, granularity],
  )

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-title-lg font-bold text-text">Analytics</h1>
        <p className="text-subhead text-text-2">Platform performance</p>
      </div>

      {/* Tabs + controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg border border-border bg-surface p-1">
          {(['overview', 'sellers'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={
                'rounded-md px-4 py-1.5 text-subhead font-medium capitalize transition-colors ' +
                (tab === t ? 'bg-primary text-on-primary' : 'text-text-2 hover:bg-surface-2')
              }
            >
              {t}
            </button>
          ))}
        </div>
        {tab === 'overview' && (
          <div className="flex items-center gap-2">
            <div className="flex gap-1 rounded-lg border border-border bg-surface p-1">
              {PRESETS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setPreset(p.key)}
                  className={
                    'rounded-md px-3 py-1.5 text-subhead font-medium transition-colors ' +
                    (preset === p.key ? 'bg-primary-soft text-on-primary-soft' : 'text-text-2 hover:bg-surface-2')
                  }
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="w-36">
              <Select
                value={granularity}
                options={[
                  { value: 'daily', label: 'Daily' },
                  { value: 'weekly', label: 'Weekly' },
                  { value: 'monthly', label: 'Monthly' },
                ]}
                onChange={(e) => setGranularity(e.target.value as AnalyticsGranularity)}
              />
            </div>
          </div>
        )}
      </div>

      {tab === 'overview' ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              label="Avg order value"
              value={money(orders.data?.averageOrderValue ?? 0)}
              loading={orders.isLoading}
            />
            <StatCard
              label="Cancellation rate"
              value={`${Math.round((orders.data?.cancellationRate ?? 0) * 100)}%`}
              loading={orders.isLoading}
            />
            <StatCard
              label="Seller rejection rate"
              value={`${Math.round((orders.data?.sellerRejectionRate ?? 0) * 100)}%`}
              loading={orders.isLoading}
            />
          </div>

          <div className="rounded-xl border border-border bg-surface p-5">
            <h3 className="mb-4 flex items-center gap-2 text-title font-semibold text-text">
              <TrendingUp size={18} className="text-text-3" /> Revenue
            </h3>
            {chartData.length === 0 ? (
              <ChartEmpty label="No data for this period" />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={chartData} margin={{ left: -10, right: 8 }}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={TEAL} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={TEAL} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
                  <XAxis dataKey="period" tick={{ fontSize: 11 }} stroke="var(--text-3)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="var(--text-3)" />
                  <Tooltip
                    formatter={(v: number) => money(v)}
                    contentStyle={{
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Area type="monotone" dataKey="revenue" stroke={TEAL} strokeWidth={2} fill="url(#revGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="rounded-xl border border-border bg-surface p-5">
            <h3 className="mb-4 flex items-center gap-2 text-title font-semibold text-text">
              <BarChart3 size={18} className="text-text-3" /> Orders
            </h3>
            {chartData.length === 0 ? (
              <ChartEmpty label="No data for this period" />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={chartData} margin={{ left: -10, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
                  <XAxis dataKey="period" tick={{ fontSize: 11 }} stroke="var(--text-3)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="var(--text-3)" allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="orders" fill={BLUE} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </>
      ) : (
        <SellersAnalyticsTab data={sellers.data} loading={sellers.isLoading} error={sellers.isError} onRetry={sellers.refetch} />
      )}
    </div>
  )
}

function SellersAnalyticsTab({
  data,
  loading,
  error,
  onRetry,
}: {
  data: SellersAnalytics | undefined
  loading: boolean
  error: boolean
  onRetry: () => void
}) {
  type Rev = SellersAnalytics['byRevenue'][number] & { rank: number }
  type Cnt = SellersAnalytics['byOrderCount'][number]
  type Ful = SellersAnalytics['fulfillmentTime'][number]

  const revCols: Column<Rev>[] = [
    { key: 'rank', header: '#', width: '48px', render: (r) => <span className="text-text-3">{r.rank}</span> },
    { key: 'shopName', header: 'Shop', render: (r) => r.shopName ?? '—' },
    { key: 'revenue', header: 'Revenue', align: 'right', render: (r) => money(r.revenue) },
  ]
  const cntCols: Column<Cnt>[] = [
    { key: 'shopName', header: 'Shop', render: (r) => r.shopName ?? '—' },
    { key: 'orderCount', header: 'Orders', align: 'right', render: (r) => r.orderCount },
  ]
  const fulCols: Column<Ful>[] = [
    { key: 'shopName', header: 'Shop', render: (r) => r.shopName ?? '—' },
    { key: 'avgMinutes', header: 'Avg fulfilment', align: 'right', render: (r) => `${r.avgMinutes} min` },
  ]

  const revRows: Rev[] = (data?.byRevenue ?? []).map((r, i) => ({ ...r, rank: i + 1 }))

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
      <div>
        <h3 className="mb-3 text-title font-semibold text-text">Top sellers by revenue</h3>
        <Table<Rev>
          columns={revCols}
          data={revRows}
          rowKey={(r) => r.sellerId ?? String(r.rank)}
          loading={loading}
          error={error}
          onRetry={onRetry}
          emptyTitle="No data"
        />
      </div>
      <div>
        <h3 className="mb-3 text-title font-semibold text-text">Top sellers by order count</h3>
        <Table<Cnt>
          columns={cntCols}
          data={data?.byOrderCount}
          rowKey={(r) => r.sellerId ?? r.shopName ?? ''}
          loading={loading}
          error={error}
          onRetry={onRetry}
          emptyTitle="No data"
        />
      </div>
      <div className="xl:col-span-2">
        <h3 className="mb-3 text-title font-semibold text-text">Fastest fulfilment</h3>
        <Table<Ful>
          columns={fulCols}
          data={data?.fulfillmentTime}
          rowKey={(r) => r.sellerId}
          loading={loading}
          error={error}
          onRetry={onRetry}
          emptyTitle="No data"
        />
      </div>
    </div>
  )
}
