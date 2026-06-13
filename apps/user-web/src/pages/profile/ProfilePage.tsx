import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import {
  User,
  ChevronRight,
  MapPin,
  Heart,
  Pencil,
  Bell,
  Sun,
  Moon,
  Monitor,
  LogOut,
} from 'lucide-react'
import { useMe, useUpdateMe } from '@/api/hooks/useUser'
import { useAuthStore } from '@/stores/authStore'
import { useAddressStore } from '@/stores/addressStore'
import { useThemeStore, type ThemePref } from '@/stores/themeStore'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatPhone } from '@/lib/format'
import { cn } from '@/lib/cn'

const themeOptions: { value: ThemePref; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
]

export function ProfilePage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { data: me, isLoading } = useMe()
  const updateMe = useUpdateMe()
  const logout = useAuthStore((s) => s.logout)
  const clearAddress = useAddressStore((s) => s.clear)
  const { pref, setPref } = useThemeStore()

  const storeUser = useAuthStore((s) => s.user)
  const user = me ?? storeUser

  function handleLogout() {
    logout()
    clearAddress()
    qc.clear()
    navigate('/login', { replace: true })
  }

  const menu = [
    { icon: Pencil, label: 'Edit profile', to: '/profile/edit' },
    { icon: MapPin, label: 'Saved addresses', to: '/profile/addresses' },
    { icon: Heart, label: 'Favourites', to: '/profile/favorites' },
  ]

  return (
    <div className="px-5 pb-28 pt-3">
      <h1 className="mb-4 text-title-lg font-bold text-text">Account</h1>

      {/* User header */}
      <div className="flex items-center gap-3 rounded-lg border border-border bg-surface p-4">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-primary-soft text-primary">
          <User size={26} />
        </span>
        <div className="min-w-0 flex-1">
          {isLoading && !user ? (
            <Skeleton className="h-5 w-32" />
          ) : (
            <>
              <p className="truncate text-body font-bold text-text">{user?.name || 'Add your name'}</p>
              {user?.phone && <p className="text-subhead text-text-2 mono-num">{formatPhone(user.phone)}</p>}
            </>
          )}
        </div>
      </div>

      {/* Menu */}
      <div className="mt-4 overflow-hidden rounded-lg border border-border bg-surface">
        {menu.map((m, i) => (
          <button
            key={m.to}
            onClick={() => navigate(m.to)}
            className={cn('flex w-full items-center gap-3 px-4 py-3.5 text-left', i > 0 && 'border-t border-border-faint')}
          >
            <m.icon size={19} className="text-text-2" />
            <span className="flex-1 text-body font-medium text-text">{m.label}</span>
            <ChevronRight size={18} className="text-text-3" />
          </button>
        ))}
      </div>

      {/* Notifications */}
      <div className="mt-4 overflow-hidden rounded-lg border border-border bg-surface">
        <div className="flex items-center gap-3 px-4 py-3.5">
          <Bell size={19} className="text-text-2" />
          <span className="flex-1 text-body font-medium text-text">Order updates</span>
          <Toggle
            checked={user?.notificationOrderUpdates ?? true}
            onChange={(v) => updateMe.mutate({ notificationOrderUpdates: v })}
          />
        </div>
        <div className="flex items-center gap-3 border-t border-border-faint px-4 py-3.5">
          <Bell size={19} className="text-text-2" />
          <span className="flex-1 text-body font-medium text-text">Promotions</span>
          <Toggle
            checked={user?.notificationPromotions ?? false}
            onChange={(v) => updateMe.mutate({ notificationPromotions: v })}
          />
        </div>
      </div>

      {/* Appearance */}
      <div className="mt-4 rounded-lg border border-border bg-surface p-4">
        <p className="mb-2 text-subhead font-semibold text-text-2">Appearance</p>
        <div className="flex rounded-md bg-surface-2 p-1">
          {themeOptions.map((o) => (
            <button
              key={o.value}
              onClick={() => setPref(o.value)}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 rounded-[8px] py-2 text-subhead font-semibold transition-colors',
                pref === o.value ? 'bg-surface text-text shadow-sm' : 'text-text-2',
              )}
            >
              <o.icon size={16} /> {o.label}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleLogout}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-danger/30 bg-danger-soft px-4 py-3.5 text-body font-semibold text-danger"
      >
        <LogOut size={18} /> Log out
      </button>
    </div>
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn('h-7 w-12 shrink-0 rounded-full p-0.5 transition-colors', checked ? 'bg-primary' : 'bg-surface-3')}
    >
      <span className={cn('block h-6 w-6 rounded-full bg-white shadow-sm transition-transform', checked && 'translate-x-5')} />
    </button>
  )
}
