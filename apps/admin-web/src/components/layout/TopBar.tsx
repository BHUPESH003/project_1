import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Bell, Search, Settings, LogOut, ChevronDown } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useAdminSellers } from '@/api/hooks/useAdminSellers'
import { formatPhone } from '@/lib/format'
import { cn } from '@/lib/cn'

export function TopBar() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const [query, setQuery] = useState('')

  // Pending seller approvals drive the notification badge.
  const { data: pending } = useAdminSellers({ isVerified: false, limit: 1 })
  const pendingCount = pending?.total ?? 0

  function submitSearch() {
    const q = query.trim()
    if (!q) return
    // Order ids look like cuids ("c…" 25 chars) — route those to orders.
    if (/^c[a-z0-9]{20,}$/i.test(q)) navigate(`/orders/${q}`)
    else navigate(`/sellers?search=${encodeURIComponent(q)}`)
  }

  const initials =
    user?.name?.trim()?.[0]?.toUpperCase() ?? user?.phone?.slice(-2) ?? 'A'

  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b border-border bg-surface px-5">
      <div className="relative max-w-md flex-1">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-3"
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submitSearch()}
          placeholder="Search orders by ID, sellers by name…"
          className="h-10 w-full rounded-lg border border-border bg-bg pl-9 pr-3 text-subhead text-text outline-none placeholder:text-text-3 focus:border-primary focus:shadow-[0_0_0_3px_var(--primary-soft)]"
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={() => navigate('/sellers?tab=pending')}
          aria-label="Pending approvals"
          className="relative grid h-10 w-10 place-items-center rounded-lg text-text-2 hover:bg-surface-2"
        >
          <Bell size={19} />
          {pendingCount > 0 && (
            <span className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-danger px-1 text-[10px] font-bold leading-none text-white">
              {pendingCount > 9 ? '9+' : pendingCount}
            </span>
          )}
        </button>

        <DropdownMenu.Root>
          <DropdownMenu.Trigger
            className={cn(
              'flex items-center gap-2 rounded-lg py-1.5 pl-1.5 pr-2 hover:bg-surface-2 focus:outline-none',
            )}
          >
            <span className="grid h-8 w-8 place-items-center rounded-full bg-primary text-caption font-bold text-on-primary">
              {initials}
            </span>
            <span className="hidden text-left sm:block">
              <span className="block text-subhead font-semibold leading-tight text-text">
                {user?.name ?? 'Admin'}
              </span>
              <span className="block text-caption leading-tight text-text-3 mono-num">
                {user?.phone ? formatPhone(user.phone) : ''}
              </span>
            </span>
            <ChevronDown size={15} className="text-text-3" />
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={6}
              className="z-[80] min-w-44 rounded-lg border border-border bg-surface p-1 shadow-lg"
            >
              <DropdownMenu.Item
                onSelect={() => navigate('/settings')}
                className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-subhead text-text outline-none hover:bg-surface-2"
              >
                <Settings size={16} /> Settings
              </DropdownMenu.Item>
              <DropdownMenu.Separator className="my-1 h-px bg-border-faint" />
              <DropdownMenu.Item
                onSelect={logout}
                className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-subhead text-danger outline-none hover:bg-danger-soft"
              >
                <LogOut size={16} /> Logout
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </header>
  )
}
