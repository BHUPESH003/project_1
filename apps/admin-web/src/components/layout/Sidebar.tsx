import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  ShoppingBag,
  Store,
  Image,
  Grid3x3,
  BarChart3,
  Wallet,
  Bell,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { useUiStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/authStore'

interface NavItem {
  to: string
  label: string
  icon: typeof LayoutDashboard
  end?: boolean
}

const NAV: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/orders', label: 'Orders', icon: ShoppingBag },
  { to: '/sellers', label: 'Sellers', icon: Store },
  { to: '/banners', label: 'Banners', icon: Image },
  { to: '/categories', label: 'Categories', icon: Grid3x3 },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/payouts', label: 'Payouts', icon: Wallet },
  { to: '/notifications', label: 'Notifications', icon: Bell },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  const collapsed = useUiStore((s) => s.sidebarCollapsed)
  const toggle = useUiStore((s) => s.toggleSidebar)
  const logout = useAuthStore((s) => s.logout)

  return (
    <aside
      className={cn(
        'flex shrink-0 flex-col bg-sidebar text-sidebar-text transition-[width] duration-200',
        collapsed ? 'w-15' : 'w-60',
      )}
    >
      {/* Brand */}
      <div
        className={cn(
          'flex h-16 items-center gap-2.5 border-b border-sidebar-border px-4',
          collapsed && 'justify-center px-0',
        )}
      >
        <div
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-white"
          style={{ background: 'var(--grad-primary)' }}
        >
          <Store size={18} />
        </div>
        {!collapsed && (
          <span className="truncate text-title font-bold text-sidebar-text-active">
            ShopOS Admin
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2.5 py-3">
        <ul className="flex flex-col gap-1">
          {NAV.map((item) => {
            const Icon = item.icon
            return (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  title={collapsed ? item.label : undefined}
                  className={({ isActive }) =>
                    cn(
                      'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-subhead font-medium transition-colors',
                      collapsed && 'justify-center px-0',
                      isActive
                        ? 'bg-sidebar-active-bg text-sidebar-text-active'
                        : 'text-sidebar-text hover:bg-sidebar-2 hover:text-sidebar-text-active',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <span className="absolute left-0 top-1/2 h-5 w-0.75 -translate-y-1/2 rounded-r bg-primary" />
                      )}
                      <Icon size={19} className="shrink-0" />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </>
                  )}
                </NavLink>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Footer: collapse + logout */}
      <div className="border-t border-sidebar-border p-2.5">
        <button
          onClick={logout}
          title={collapsed ? 'Logout' : undefined}
          className={cn(
            'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-subhead font-medium text-sidebar-text transition-colors hover:bg-sidebar-2 hover:text-sidebar-text-active',
            collapsed && 'justify-center px-0',
          )}
        >
          <LogOut size={19} className="shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
        <button
          onClick={toggle}
          title={collapsed ? 'Expand' : 'Collapse'}
          className={cn(
            'mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-subhead font-medium text-sidebar-text transition-colors hover:bg-sidebar-2 hover:text-sidebar-text-active',
            collapsed && 'justify-center px-0',
          )}
        >
          {collapsed ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  )
}
