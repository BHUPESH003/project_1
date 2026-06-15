import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

/** Sticky header for pushed (stack) pages — back arrow + title + optional action. */
export function StackHeader({
  title,
  subtitle,
  action,
  onBack,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
  onBack?: () => void
}) {
  const navigate = useNavigate()
  return (
    <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-border bg-surface/95 px-3 py-3 backdrop-blur-md">
      <button
        onClick={() => (onBack ? onBack() : navigate(-1))}
        aria-label="Back"
        className="tap grid h-10 w-10 shrink-0 place-items-center rounded-full text-text-2"
      >
        <ArrowLeft size={22} />
      </button>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-title font-bold text-text">{title}</h1>
        {subtitle && <p className="truncate text-caption text-text-3">{subtitle}</p>}
      </div>
      {action}
    </header>
  )
}
