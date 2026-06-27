import { useEffect, useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { Header } from './Header'
import { BottomNav } from './BottomNav'
import { FloatingCartBar } from './FloatingCartBar'
import { AddressOverlay } from '@/components/sheets/AddressOverlay'
import { SearchOverlay } from '@/components/sheets/SearchOverlay'
import { PushPermissionBanner } from '@/components/PushPermissionBanner'
import { useAuthStore } from '@/stores/authStore'
import { useAddressStore } from '@/stores/addressStore'
import { useCart } from '@/api/hooks/useCart'
import { useMultiCheckout } from '@/api/hooks/useCheckout'
import { useWebPush } from '@/hooks/useWebPush'

/**
 * Pre-fetches delivery quotes as soon as the user has items in their cart and a
 * saved address. When they navigate to /cart, the data is already cached and they
 * don't wait for the delivery partner API round-trip.
 */
function CheckoutPrefetcher() {
  const address = useAddressStore((s) => s.selectedAddress)
  const { data: cart } = useCart()
  const hasItems = (cart?.items?.length ?? 0) > 0
  // Subscribing to useMultiCheckout here (enabled when conditions met) shares the
  // same React Query cache key as CartPage, so no duplicate requests are made.
  useMultiCheckout(hasItems && address?.id ? address.id : undefined)
  return null
}

export function AppShell() {
  const navigate = useNavigate()
  const isAuthed = useAuthStore((s) => s.isAuthenticated)
  const address = useAddressStore((s) => s.selectedAddress)
  const [addressOpen, setAddressOpen] = useState(false)

  const { permissionState, requestAndSubscribe } = useWebPush()

  // Auth gate.
  useEffect(() => {
    if (!isAuthed) navigate('/login', { replace: true })
  }, [isAuthed, navigate])

  // Address-first discovery: force selection on first launch.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isAuthed && !address) setAddressOpen(true)
  }, [isAuthed, address])

  if (!isAuthed) return null

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      {permissionState === 'default' && (
        <PushPermissionBanner onEnable={requestAndSubscribe} />
      )}
      <Header onOpenAddress={() => setAddressOpen(true)} />
      <main className="relative flex-1">
        <Outlet />
      </main>
      <FloatingCartBar />
      <BottomNav />
      <AddressOverlay open={addressOpen} onOpenChange={setAddressOpen} dismissible={!!address} />
      <SearchOverlay />
      <CheckoutPrefetcher />
    </div>
  )
}
