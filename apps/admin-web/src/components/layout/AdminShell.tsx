import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { useUiStore } from '@/stores/uiStore'

/**
 * App frame: dark sidebar + top bar + scrollable content area. The sidebar
 * auto-collapses below 1024px so the table-heavy content keeps its width.
 */
export function AdminShell() {
  const setCollapsed = useUiStore((s) => s.setSidebarCollapsed)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1024px)')
    const apply = (matches: boolean) => {
      if (matches) setCollapsed(true)
    }
    apply(mq.matches)
    const handler = (e: MediaQueryListEvent) => apply(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [setCollapsed])

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-bg">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1400px] px-6 py-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
