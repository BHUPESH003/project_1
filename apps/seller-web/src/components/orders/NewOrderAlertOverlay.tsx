import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { money } from '@/lib/format'
import { customerFirstName, itemsSummary } from '@/lib/orders'
import { AUTO_DECLINE_SECONDS } from '@/lib/constants'
import type { SellerOrderSummary } from '@/types/api'

function remainingSeconds(createdAt: string): number {
  const elapsed = (Date.now() - new Date(createdAt).getTime()) / 1000
  return Math.max(0, Math.round(AUTO_DECLINE_SECONDS - elapsed))
}

/**
 * Full-screen new-order announcement. Cannot be dismissed by tapping outside —
 * the seller must explicitly View & Accept or Reject. A countdown bar mirrors
 * the backend 5-minute auto-decline (green → amber → red).
 */
export function NewOrderAlertOverlay({
  order,
  onView,
  onReject,
  rejecting,
}: {
  order: SellerOrderSummary
  onView: () => void
  onReject: () => void
  rejecting?: boolean
}) {
  const [secs, setSecs] = useState(() => remainingSeconds(order.createdAt))

  useEffect(() => {
    const t = setInterval(() => setSecs(remainingSeconds(order.createdAt)), 1000)
    return () => clearInterval(t)
  }, [order.createdAt])

  const pct = Math.max(0, Math.min(100, (secs / AUTO_DECLINE_SECONDS) * 100))
  const barColor = secs <= 30 ? 'bg-danger' : secs <= 120 ? 'bg-warning' : 'bg-success'
  const mm = Math.floor(secs / 60)
  const ss = (secs % 60).toString().padStart(2, '0')

  return (
    <motion.div
      data-testid="new-order-alert"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center px-6"
      style={{ background: 'rgba(0,0,0,0.85)' }}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 22 }}
        className="w-full max-w-[360px] rounded-2xl bg-surface p-6 shadow-float"
      >
        <div className="flex flex-col items-center text-center">
          <motion.div
            animate={{ scale: [1, 1.12, 1] }}
            transition={{ repeat: Infinity, duration: 1.2 }}
            className="grid h-16 w-16 place-items-center rounded-full text-on-primary"
            style={{ background: 'var(--grad-primary)' }}
          >
            <Bell size={30} fill="currentColor" />
          </motion.div>
          <h2 className="mt-4 text-title-lg font-extrabold text-text">New Order!</h2>
          <p className="mt-1 text-subhead text-text-2">
            From {customerFirstName(order.user?.name)}
          </p>

          <div className="mt-4 w-full rounded-xl bg-surface-2 px-4 py-3 text-left">
            <p className="text-body font-semibold text-text">{itemsSummary(order)}</p>
            <p className="mt-0.5 text-title font-extrabold text-primary tnum">
              {money(order.pricing.totalAmount)}
            </p>
          </div>

          {/* Countdown */}
          <div className="mt-4 w-full">
            <div className="h-2 w-full overflow-hidden rounded-full bg-surface-3">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${barColor}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="mt-1.5 text-caption text-text-3">
              Auto-declines in <span className="mono-num font-semibold text-text-2">{mm}:{ss}</span>
            </p>
          </div>

          <div className="mt-5 flex w-full flex-col gap-2.5">
            <Button full size="lg" onClick={onView} data-testid="alert-view">
              View &amp; Accept
            </Button>
            <Button
              full
              size="md"
              variant="danger"
              onClick={onReject}
              loading={rejecting}
            >
              Reject
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
