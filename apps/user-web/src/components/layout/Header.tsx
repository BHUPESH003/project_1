import { Bell, ChevronDown, MapPin, User } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAddressStore } from '@/stores/addressStore'
import { IconButton } from '@/components/ui/IconButton'

export function Header({ onOpenAddress }: { onOpenAddress: () => void }) {
  const navigate = useNavigate()
  const address = useAddressStore((s) => s.selectedAddress)

  return (
    <header className="sticky top-0 z-30 glass px-5 pt-[max(12px,env(safe-area-inset-top))] pb-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenAddress}
          className="flex min-w-0 flex-1 flex-col items-start text-left tap"
        >
          <span className="flex items-center gap-1 text-[10px] font-bold tracking-[0.08em] text-text-3">
            <MapPin size={12} className="text-primary" /> DELIVER TO
          </span>
          <span className="flex max-w-full items-center gap-1 text-title font-bold text-text">
            <span className="truncate">{address?.label ?? 'Select location'}</span>
            <ChevronDown size={16} className="shrink-0 text-text-2" />
          </span>
        </button>
        <IconButton variant="ghost" aria-label="Notifications" onClick={() => navigate('/orders')}>
          <span className="relative">
            <Bell size={20} />
            <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-accent" />
          </span>
        </IconButton>
        <IconButton variant="ghost" aria-label="Profile" onClick={() => navigate('/profile')}>
          <User size={20} />
        </IconButton>
      </div>
    </header>
  )
}
