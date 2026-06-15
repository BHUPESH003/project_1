import { NavLink } from 'react-router-dom'
import { ClipboardList, Package, Store } from 'lucide-react'
import { cn } from '@/lib/cn'

const tabs = [
  { to: '/dashboard', label: 'Orders', icon: ClipboardList },
  { to: '/products', label: 'Products', icon: Package },
  { to: '/shop/settings', label: 'Shop', icon: Store },
]

/** Fixed 3-tab bottom navigation for the approved seller area. */
export function BottomNav() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 mx-auto flex max-w-[430px] items-stretch border-t border-border bg-surface/95 backdrop-blur-md"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {tabs.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className="flex flex-1 flex-col items-center justify-center gap-1 py-2.5"
        >
          {({ isActive }) => (
            <>
              <Icon
                size={23}
                className={cn(isActive ? 'text-primary' : 'text-text-3')}
                strokeWidth={isActive ? 2.4 : 2}
              />
              <span
                className={cn(
                  'text-micro font-semibold',
                  isActive ? 'text-primary' : 'text-text-3',
                )}
              >
                {label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
