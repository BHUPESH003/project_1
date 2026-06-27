import { useEffect, useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { SellerStatus } from '@repo/types'
import { Bell, X } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useSellerProfile } from '@/api/hooks/useSeller'
import { Spinner } from '@/components/ui/Spinner'
import { BottomNav } from './BottomNav'
import { SellerAlertProvider } from '@/components/orders/SellerAlertProvider'
import { useWebPush } from '@/hooks/useWebPush'

/**
 * Gate + layout for the approved seller area. Routing rules (mirrors the
 * master prompt):
 *   not authed            → /login
 *   no seller profile (null) → /register
 *   isSuspended           → /suspended
 *   !isVerified           → /pending
 *   otherwise             → render shell (dashboard / products / shop)
 */
export function AppShell() {
  const navigate = useNavigate()
  const isAuthed = useAuthStore((s) => s.isAuthenticated)
  const { data: seller, isLoading } = useSellerProfile()
  const { permissionState, requestAndSubscribe } = useWebPush()
  const [bannerDismissed, setBannerDismissed] = useState(
    () => localStorage.getItem('seller-notif-banner-dismissed') === '1',
  )
  const showBanner = permissionState === 'default' && !bannerDismissed

  useEffect(() => {
    if (!isAuthed) {
      navigate('/login', { replace: true })
      return
    }
    if (isLoading) return
    // `null` = authenticated but no shop registered yet (expected onboarding
    // state, returned as a normal 200 — not an error).
    if (seller === null) {
      navigate('/register', { replace: true })
      return
    }
    if (seller?.isSuspended) {
      navigate('/suspended', { replace: true })
      return
    }
    if (seller && !seller.isVerified) {
      navigate('/pending', { replace: true })
    }
  }, [isAuthed, seller, isLoading, navigate])

  if (!isAuthed) return null

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Spinner size={28} />
      </div>
    )
  }

  // While redirecting (no profile / pending / suspended) render nothing.
  if (!seller || seller.isSuspended || !seller.isVerified) return null

  const isOnline = seller.status === SellerStatus.ONLINE

  function dismissBanner() {
    localStorage.setItem('seller-notif-banner-dismissed', '1')
    setBannerDismissed(true)
  }

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      {showBanner && (
        <div className="flex items-center gap-3 border-b border-warning/30 bg-warning-soft px-4 py-2.5">
          <Bell size={16} className="shrink-0 text-warning" />
          <p className="flex-1 text-caption text-text-2">
            Enable notifications to get new order alerts even when this tab is in the background.
          </p>
          <button
            className="shrink-0 rounded-lg bg-warning px-3 py-1 text-caption font-bold text-white"
            onClick={async () => {
              await requestAndSubscribe()
              dismissBanner()
            }}
          >
            Enable
          </button>
          <button onClick={dismissBanner} className="shrink-0 text-text-3">
            <X size={16} />
          </button>
        </div>
      )}
      <main className="relative flex-1 pb-[calc(64px+env(safe-area-inset-bottom))]">
        <Outlet />
      </main>
      <BottomNav />
      <SellerAlertProvider isOnline={isOnline} />
    </div>
  )
}
