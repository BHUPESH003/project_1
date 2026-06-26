import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Package, Megaphone, Info, CheckCheck } from 'lucide-react'
import { BottomSheet } from './BottomSheet'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { useNotifications, useMarkAllRead, useMarkRead } from '@/api/hooks/useNotifications'
import { cn } from '@/lib/cn'
import type { AppNotification } from '@/api/types'

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1) return 'Just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

function NotifIcon({ type }: { type: AppNotification['type'] }) {
  if (type === 'ORDER_UPDATE') return <Package size={18} className="text-primary" />
  if (type === 'MARKETING') return <Megaphone size={18} className="text-accent" />
  return <Info size={18} className="text-text-3" />
}

function NotifRow({ n }: { n: AppNotification }) {
  const navigate = useNavigate()
  const markRead = useMarkRead()

  function handleTap() {
    if (!n.read) markRead.mutate(n.id)
    if (n.orderId) navigate(`/orders/${n.orderId}`)
  }

  return (
    <button
      type="button"
      onClick={handleTap}
      className={cn(
        'flex w-full items-start gap-3 rounded-xl px-4 py-3.5 text-left transition-colors tap',
        n.read ? 'bg-surface' : 'bg-primary-soft',
      )}
    >
      <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-2">
        <NotifIcon type={n.type} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span className={cn('block text-subhead', n.read ? 'font-medium text-text' : 'font-bold text-text')}>
            {n.title}
          </span>
          {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
        </span>
        <span className="mt-0.5 block text-caption text-text-2 line-clamp-2">{n.body}</span>
        <span className="mt-1 block text-[11px] text-text-3">{timeAgo(n.createdAt)}</span>
      </span>
    </button>
  )
}

export function NotificationsSheet({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useNotifications()
  const markAllRead = useMarkAllRead()

  const pages = data?.pages ?? []
  const allItems = pages.flatMap((p) => p.items)
  const totalUnread = allItems.filter((n) => !n.read).length

  // Mark all read when the sheet is closed if there were unread items
  useEffect(() => {
    if (!open && totalUnread > 0) {
      markAllRead.mutate()
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title="Notifications">
      <div className="-mx-4 -mb-4 flex max-h-[70vh] flex-col">
        {/* Actions bar */}
        {totalUnread > 0 && (
          <div className="flex items-center justify-between border-b border-border px-4 pb-3">
            <span className="text-caption text-text-3">{totalUnread} unread</span>
            <button
              type="button"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
              className="inline-flex items-center gap-1.5 text-caption font-semibold text-primary"
            >
              <CheckCheck size={14} />
              Mark all read
            </button>
          </div>
        )}

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Spinner />
            </div>
          ) : allItems.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <Bell size={36} className="text-text-3" />
              <p className="text-body font-semibold text-text">All caught up</p>
              <p className="text-subhead text-text-2">Your notifications will appear here.</p>
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {allItems.map((n) => (
                <NotifRow key={n.id} n={n} />
              ))}
              {hasNextPage && (
                <div className="pt-2">
                  <Button
                    variant="secondary"
                    full
                    loading={isFetchingNextPage}
                    onClick={() => fetchNextPage()}
                  >
                    Load more
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </BottomSheet>
  )
}
