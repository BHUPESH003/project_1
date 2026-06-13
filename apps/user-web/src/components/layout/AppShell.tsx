import { useEffect, useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { Header } from './Header'
import { BottomNav } from './BottomNav'
import { FloatingCartBar } from './FloatingCartBar'
import { AddressSheet } from '@/components/sheets/AddressSheet'
import { useAuthStore } from '@/stores/authStore'
import { useAddressStore } from '@/stores/addressStore'

export function AppShell() {
  const navigate = useNavigate()
  const isAuthed = useAuthStore((s) => s.isAuthenticated)
  const address = useAddressStore((s) => s.selectedAddress)
  const [addressOpen, setAddressOpen] = useState(false)

  // Auth gate.
  useEffect(() => {
    if (!isAuthed) navigate('/login', { replace: true })
  }, [isAuthed, navigate])

  // Address-first discovery: force selection on first launch.
  useEffect(() => {
    if (isAuthed && !address) setAddressOpen(true)
  }, [isAuthed, address])

  if (!isAuthed) return null

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <Header onOpenAddress={() => setAddressOpen(true)} />
      <main className="relative flex-1">
        <Outlet />
      </main>
      <FloatingCartBar />
      <BottomNav />
      <AddressSheet open={addressOpen} onOpenChange={setAddressOpen} dismissible={!!address} />
    </div>
  )
}
