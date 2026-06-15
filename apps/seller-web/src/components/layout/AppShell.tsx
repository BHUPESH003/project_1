import { useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { AxiosError } from 'axios'
import { SellerStatus } from '@repo/types'
import { useAuthStore } from '@/stores/authStore'
import { useSellerProfile } from '@/api/hooks/useSeller'
import { Spinner } from '@/components/ui/Spinner'
import { BottomNav } from './BottomNav'
import { SellerAlertProvider } from '@/components/orders/SellerAlertProvider'

/**
 * Gate + layout for the approved seller area. Routing rules (mirrors the
 * master prompt):
 *   not authed            → /login
 *   no seller profile (404) → /register
 *   isSuspended           → /suspended
 *   !isVerified           → /pending
 *   otherwise             → render shell (dashboard / products / shop)
 */
export function AppShell() {
  const navigate = useNavigate()
  const isAuthed = useAuthStore((s) => s.isAuthenticated)
  const { data: seller, isLoading, error } = useSellerProfile()

  useEffect(() => {
    if (!isAuthed) {
      navigate('/login', { replace: true })
      return
    }
    if (error instanceof AxiosError && error.response?.status === 404) {
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
  }, [isAuthed, seller, error, navigate])

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

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <main className="relative flex-1 pb-[calc(64px+env(safe-area-inset-bottom))]">
        <Outlet />
      </main>
      <BottomNav />
      <SellerAlertProvider isOnline={isOnline} />
    </div>
  )
}
