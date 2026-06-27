import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { OrderStatus } from '@repo/types'
import { useSellerOrders, useRejectOrder } from '@/api/hooks/useSellerOrders'
import { useAlertStore } from '@/stores/alertStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { NEW_ORDER_POLL_MS } from '@/lib/constants'
import { playAlertChime, stopAlertChime } from '@/lib/audio'
import {
  isTabHidden,
  showOrderNotification,
  startTitleFlash,
  stopTitleFlash,
} from '@/lib/notifications'
import { itemsSummary } from '@/lib/orders'
import { money } from '@/lib/format'
import { getErrorMessage } from '@/api/client'
import { toast } from '@/stores/toastStore'
import { NewOrderAlertOverlay } from './NewOrderAlertOverlay'

/**
 * Watches for new PAID orders while the seller is ONLINE and raises the
 * full-screen alert (sound + overlay + background notification). Mounted once
 * inside the approved shell. Polls every 5s and diffs order IDs via a ref so a
 * re-render never re-fires an alert.
 */
export function SellerAlertProvider({ isOnline }: { isOnline: boolean }) {
  const navigate = useNavigate()
  const { data: paidOrders } = useSellerOrders(OrderStatus.PAID, {
    pollMs: isOnline ? NEW_ORDER_POLL_MS : undefined,
    enabled: isOnline,
  })

  const alertingOrder = useAlertStore((s) => s.alertingOrder)
  const triggerAlert = useAlertStore((s) => s.triggerAlert)
  const dismissAlert = useAlertStore((s) => s.dismissAlert)
  const soundEnabled = useSettingsStore((s) => s.soundEnabled)
  const reject = useRejectOrder()

  const knownIds = useRef<Set<string> | null>(null)

  // Reset the baseline whenever we go offline so re-going-online doesn't alert
  // for orders that arrived while away (they'll show in the New list instead).
  useEffect(() => {
    if (!isOnline) knownIds.current = null
  }, [isOnline])

  useEffect(() => {
    if (!isOnline || !paidOrders) return

    const ids = paidOrders.map((o) => o.order_id)

    // First successful fetch: capture baseline, don't alert for pre-existing.
    if (knownIds.current === null) {
      knownIds.current = new Set(ids)
      return
    }

    const fresh = paidOrders.filter((o) => !knownIds.current!.has(o.order_id))
    knownIds.current = new Set(ids)

    if (fresh.length === 0) return

    // Announce the newest arrival (only one overlay at a time).
    const newest = fresh[fresh.length - 1]
    if (!useAlertStore.getState().alertingOrder) {
      triggerAlert(newest)
      if (soundEnabled) playAlertChime()
      if (isTabHidden()) {
        showOrderNotification(`${itemsSummary(newest)} • ${money(newest.pricing.totalAmount)}`)
        startTitleFlash()
      }
    }
  }, [paidOrders, isOnline, soundEnabled, triggerAlert])

  // When a NEW_ORDER push arrives while this tab is open, the service worker
  // posts to BroadcastChannel so we can play the chime without a polling cycle.
  useEffect(() => {
    if (!('BroadcastChannel' in window)) return
    const ch = new BroadcastChannel('seller-push')
    ch.onmessage = (e: MessageEvent<{ type: string }>) => {
      if (e.data?.type === 'NEW_ORDER' && soundEnabled) playAlertChime()
    }
    return () => ch.close()
  }, [soundEnabled])

  // Stop the title flash once the seller returns to the tab.
  useEffect(() => {
    function onVisible() {
      if (!isTabHidden()) stopTitleFlash()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  function clearAlertEffects() {
    stopAlertChime()
    stopTitleFlash()
    dismissAlert()
  }

  function handleView() {
    const id = alertingOrder?.order_id
    clearAlertEffects()
    if (id) navigate(`/orders/${id}`)
  }

  async function handleReject() {
    const id = alertingOrder?.order_id
    if (!id) return
    try {
      await reject.mutateAsync({ id })
      toast.success('Order rejected')
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      clearAlertEffects()
    }
  }

  return (
    <AnimatePresence>
      {alertingOrder && (
        <NewOrderAlertOverlay
          order={alertingOrder}
          onView={handleView}
          onReject={handleReject}
          rejecting={reject.isPending}
        />
      )}
    </AnimatePresence>
  )
}
