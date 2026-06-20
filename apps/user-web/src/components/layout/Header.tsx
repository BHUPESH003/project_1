import { useState } from 'react'
import { Bell, ChevronDown, MapPin, Mic, Search, User, ArrowLeft } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAddressStore } from '@/stores/addressStore'
import { useDiscoveryStore } from '@/stores/discoveryStore'
import { useSearchStore } from '@/stores/searchStore'
import { IconButton } from '@/components/ui/IconButton'
import { cn } from '@/lib/cn'

export function Header({ onOpenAddress }: { onOpenAddress: () => void }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  if (pathname === '/') return <HomeHeader onOpenAddress={onOpenAddress} />
  // Seller detail has its own floating back + favourite buttons overlaid on the hero.
  // Rendering the AppShell header there would create a duplicate back button.
  if (pathname.startsWith('/sellers/')) return null
  return <CompactHeader navigate={navigate} />
}

// ─── Route metadata ───────────────────────────────────────────────────────────

/** Tab routes show no back button (they are the root of their nav tree). */
const TAB_ROUTES = new Set(['/', '/search', '/profile'])

function isTabRoute(pathname: string) {
  return TAB_ROUTES.has(pathname)
}

// ─── Compact header (all non-home, non-seller routes) ─────────────────────────

function CompactHeader({ navigate }: { navigate: ReturnType<typeof useNavigate> }) {
  const { pathname } = useLocation()
  const isTab = isTabRoute(pathname)
  const openSearch = useSearchStore((s) => s.openSearch)

  // Local state for the expand-then-open animation
  const [expanding, setExpanding] = useState(false)

  function handleSearchTap() {
    setExpanding(true)
    // Brief expansion delay before opening the overlay for a smoother feel
    setTimeout(() => {
      setExpanding(false)
      openSearch()
    }, 120)
  }

  return (
    <header className="sticky top-0 z-30 glass border-b border-border-faint">
      <div
        className="flex items-center gap-2 px-3 pb-3"
        style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}
      >
        {/* Left — back button (hidden on tab routes) */}
        {!isTab && (
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Back"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-text-2 transition-colors tap hover:bg-surface-2"
          >
            <ArrowLeft size={20} />
          </button>
        )}

        {/* Center — tappable search bar; expands briefly then opens the overlay */}
        <button
          type="button"
          onClick={handleSearchTap}
          className={cn(
            'flex min-w-0 flex-1 items-center gap-2 rounded-full border bg-surface px-3 py-2 transition-all duration-150 tap',
            expanding ? 'border-primary shadow-sm' : 'border-border',
          )}
        >
          <Search size={15} className="shrink-0 text-text-3" />
          <span className="flex-1 truncate text-body text-text-3">Search…</span>
        </button>

        {/* Right — profile icon */}
        <IconButton
          variant="ghost"
          aria-label="Profile"
          onClick={() => navigate('/profile')}
        >
          <User size={20} />
        </IconButton>
      </div>
    </header>
  )
}

// ─── Home hero header ─────────────────────────────────────────────────────────

/**
 * Home hero header — brand-teal gradient band carrying the live delivery ETA,
 * the address selector, account actions, and the search entry point. The ETA is
 * published by HomePage via the discovery store (the nearest available seller's
 * estimated delivery time); it falls back to the plain "deliver to" label.
 */
function HomeHeader({ onOpenAddress }: { onOpenAddress: () => void }) {
  const navigate = useNavigate()
  const address = useAddressStore((s) => s.selectedAddress)
  const eta = useDiscoveryStore((s) => s.nearestEtaMins)
  const openSearch = useSearchStore((s) => s.openSearch)
  const hasEta = eta != null && !!address

  return (
    <header
      className="sticky top-0 z-30 rounded-b-[24px] px-5 pt-[max(12px,env(safe-area-inset-top))] pb-4 text-on-primary shadow-md"
      style={{ background: 'var(--grad-primary)' }}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={onOpenAddress}
          className="flex min-w-0 flex-1 flex-col items-start text-left tap"
        >
          <span className="text-[10px] font-bold uppercase tracking-[0.1em] opacity-80">
            {hasEta ? 'Delivery in' : 'Deliver to'}
          </span>
          {hasEta ? (
            <>
              <span className="text-title-lg font-extrabold leading-tight">{eta} min</span>
              <span className="mt-0.5 flex max-w-full items-center gap-1 text-subhead font-medium opacity-90">
                <MapPin size={13} className="shrink-0" />
                <span className="truncate">{address?.label}</span>
                <ChevronDown size={14} className="shrink-0" />
              </span>
            </>
          ) : (
            <span className="flex max-w-full items-center gap-1 text-title-lg font-extrabold leading-tight">
              <span className="truncate">{address?.label ?? 'Select location'}</span>
              <ChevronDown size={18} className="shrink-0 opacity-90" />
            </span>
          )}
        </button>

        <HeroIconButton aria-label="Notifications" onClick={() => navigate('/orders')}>
          <Bell size={20} />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-accent ring-2 ring-[color-mix(in_srgb,var(--teal-600)_70%,transparent)]" />
        </HeroIconButton>
        <HeroIconButton aria-label="Profile" onClick={() => navigate('/profile')}>
          <User size={20} />
        </HeroIconButton>
      </div>

      <button
        type="button"
        onClick={openSearch}
        className="mt-3.5 flex w-full items-center gap-2.5 rounded-full bg-surface px-4 py-3 text-left text-text-3 shadow-sm tap"
      >
        <Search size={20} className="text-text-2" />
        <span className="flex-1 text-body">Search printing, gifts, groceries…</span>
        <Mic size={20} className="text-primary" />
      </button>
    </header>
  )
}

/** Round, frosted action button sized for the coloured hero band. */
function HeroIconButton({
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/15 text-on-primary backdrop-blur-sm tap"
      {...rest}
    >
      {children}
    </button>
  )
}
