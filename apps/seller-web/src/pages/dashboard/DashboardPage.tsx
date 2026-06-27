import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { OrderStatus, SellerStatus } from '@repo/types'
import { History, PackageCheck, Inbox } from 'lucide-react'
import { Switch } from '@/components/ui/Switch'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { OrderCard } from '@/components/orders/OrderCard'
import { useSellerProfile, useSetStatus } from '@/api/hooks/useSeller'
import {
  useSellerOrders,
  useAcceptOrder,
  useRejectOrder,
  useMarkReady,
} from '@/api/hooks/useSellerOrders'
import { ACTIVE_POLL_MS } from '@/lib/constants'
import { money } from '@/lib/format'
import { getErrorMessage } from '@/api/client'
import { toast } from '@/stores/toastStore'
import { unlockAudio } from '@/lib/audio'
import { requestNotificationPermission } from '@/lib/notifications'
import { useWebPush } from '@/hooks/useWebPush'
import { useAlertStore } from '@/stores/alertStore'
import type { SellerOrderSummary } from '@/types/api'

function isToday(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  )
}

function Section({
  title,
  count,
  tone,
  children,
}: {
  title: string
  count: number
  tone: string
  children: React.ReactNode
}) {
  if (count === 0) return null
  return (
    <section className="mt-5">
      <div className="mb-2 flex items-center gap-2">
        <h2 className="text-subhead font-bold uppercase tracking-wide text-text-2">{title}</h2>
        <span className={`grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-micro font-bold ${tone}`}>
          {count}
        </span>
      </div>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  )
}

export function DashboardPage() {
  const navigate = useNavigate()
  const { data: seller } = useSellerProfile()
  const setStatus = useSetStatus()
  const setAudioUnlocked = useAlertStore((s) => s.setAudioUnlocked)
  const { requestAndSubscribe } = useWebPush()

  const { data: orders, isLoading, error, refetch } = useSellerOrders(undefined, {
    pollMs: ACTIVE_POLL_MS,
  })

  const accept = useAcceptOrder()
  const reject = useRejectOrder()
  const markReady = useMarkReady()
  const [actingId, setActingId] = useState<string | null>(null)

  const isOnline = seller?.status === SellerStatus.ONLINE

  const groups = useMemo(() => {
    const all = orders ?? []
    return {
      newOrders: all.filter((o) => o.status === OrderStatus.PAID),
      preparing: all.filter(
        (o) =>
          o.status === OrderStatus.SELLER_ACCEPTED || o.status === OrderStatus.PREPARING,
      ),
      ready: all.filter((o) => o.status === OrderStatus.READY_FOR_PICKUP),
      completedToday: all.filter(
        (o) => o.status === OrderStatus.DELIVERED && isToday(o.updatedAt),
      ),
    }
  }, [orders])

  const stats = useMemo(() => {
    const all = orders ?? []
    const todays = all.filter((o) => isToday(o.createdAt))
    const revenue = all
      .filter((o) => o.status === OrderStatus.DELIVERED && isToday(o.updatedAt))
      .reduce((sum, o) => sum + Number(o.pricing.totalAmount ?? 0), 0)
    return {
      todayOrders: todays.length,
      revenue,
      pending: groups.newOrders.length,
    }
  }, [orders, groups.newOrders.length])

  async function toggleOnline(next: boolean) {
    try {
      if (next) {
        // Unlock audio + notifications + push subscription inside this user gesture.
        setAudioUnlocked(unlockAudio())
        void requestNotificationPermission()
        void requestAndSubscribe()
      }
      await setStatus.mutateAsync(next ? SellerStatus.ONLINE : SellerStatus.OFFLINE)
      toast.success(next ? "You're online — accepting orders" : "You're offline")
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  async function run(
    fn: () => Promise<unknown>,
    id: string,
    successMsg: string,
  ) {
    setActingId(id)
    try {
      await fn()
      toast.success(successMsg)
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setActingId(null)
    }
  }

  const renderCard = (o: SellerOrderSummary) => (
    <OrderCard
      key={o.order_id}
      order={o}
      acceptLoading={accept.isPending && actingId === o.order_id}
      rejectLoading={reject.isPending && actingId === o.order_id}
      readyLoading={markReady.isPending && actingId === o.order_id}
      onAccept={() => run(() => accept.mutateAsync(o.order_id), o.order_id, 'Order accepted')}
      onReject={() =>
        run(() => reject.mutateAsync({ id: o.order_id }), o.order_id, 'Order rejected')
      }
      onMarkReady={() =>
        run(() => markReady.mutateAsync(o.order_id), o.order_id, 'Marked ready for pickup')
      }
    />
  )

  return (
    <div>
      {/* Top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border bg-surface/95 px-4 py-3 backdrop-blur-md">
        <div className="min-w-0">
          <p className="text-caption text-text-3">Welcome back</p>
          <h1 className="truncate text-title font-extrabold text-text">
            {seller?.shopName ?? 'Your shop'}
          </h1>
        </div>
        <button
          onClick={() => toggleOnline(!isOnline)}
          className="flex shrink-0 items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5"
          disabled={setStatus.isPending}
        >
          <span className="relative flex h-2.5 w-2.5">
            {isOnline && (
              <span className="pulse-dot absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
            )}
            <span
              className={`relative inline-flex h-2.5 w-2.5 rounded-full ${isOnline ? 'bg-success' : 'bg-text-3'}`}
            />
          </span>
          <span className={`text-subhead font-bold ${isOnline ? 'text-success' : 'text-text-3'}`}>
            {isOnline ? 'Online' : 'Offline'}
          </span>
          <Switch
            checked={!!isOnline}
            onCheckedChange={toggleOnline}
            tone="success"
            aria-label="Toggle online status"
          />
        </button>
      </header>

      <div className="px-4 pb-6">
        {/* Stats */}
        <div className="mt-4 grid grid-cols-3 gap-2.5">
          <div className="rounded-xl border border-border bg-surface p-3">
            <p className="text-display font-extrabold text-text tnum">{stats.todayOrders}</p>
            <p className="text-caption text-text-3">Orders today</p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-3">
            <p className="text-title-lg font-extrabold text-text tnum">{money(stats.revenue)}</p>
            <p className="text-caption text-text-3">Revenue today</p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-3">
            <p className="text-display font-extrabold text-warning tnum">{stats.pending}</p>
            <p className="text-caption text-text-3">Pending</p>
          </div>
        </div>

        {!isOnline && (
          <div className="mt-4 rounded-xl bg-warning-soft px-4 py-3 text-subhead font-medium text-warning">
            You're offline. Go online to start receiving new orders.
          </div>
        )}

        {/* History link */}
        <button
          onClick={() => navigate('/orders/history')}
          className="mt-4 flex w-full items-center justify-between rounded-xl border border-border bg-surface px-4 py-3 text-left"
        >
          <span className="flex items-center gap-2 text-subhead font-semibold text-text">
            <History size={17} className="text-text-3" /> Order history
          </span>
          <span className="text-text-3">›</span>
        </button>

        {/* Orders */}
        {isLoading ? (
          <div className="mt-5 flex flex-col gap-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-32 w-full rounded-2xl" />
            ))}
          </div>
        ) : error ? (
          <ErrorState message={getErrorMessage(error)} onRetry={() => refetch()} />
        ) : (
          <>
            <Section
              title="New orders"
              count={groups.newOrders.length}
              tone="bg-warning text-white"
            >
              {groups.newOrders.map(renderCard)}
            </Section>
            <Section title="Preparing" count={groups.preparing.length} tone="bg-info text-white">
              {groups.preparing.map(renderCard)}
            </Section>
            <Section
              title="Ready for pickup"
              count={groups.ready.length}
              tone="bg-success text-white"
            >
              {groups.ready.map(renderCard)}
            </Section>
            <Section
              title="Completed today"
              count={groups.completedToday.length}
              tone="bg-surface-3 text-text-2"
            >
              {groups.completedToday.map((o) => (
                <OrderCard key={o.order_id} order={o} compact />
              ))}
            </Section>

            {orders &&
              groups.newOrders.length === 0 &&
              groups.preparing.length === 0 &&
              groups.ready.length === 0 &&
              groups.completedToday.length === 0 && (
                <EmptyState
                  icon={isOnline ? <Inbox size={34} /> : <PackageCheck size={34} />}
                  title={isOnline ? "You're all set" : "You're offline"}
                  description={
                    isOnline
                      ? 'New orders will appear here the moment they come in.'
                      : 'Go online to start receiving orders.'
                  }
                />
              )}
          </>
        )}
      </div>
    </div>
  )
}
