import type { ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from './Button'

/** Generic empty state — illustration/icon + title + optional CTA. */
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-6 py-12 gap-3">
      {icon && (
        <div className="w-20 h-20 grid place-items-center rounded-full bg-surface-2 text-text-3 mb-1">
          {icon}
        </div>
      )}
      <h3 className="text-title font-semibold text-text">{title}</h3>
      {description && <p className="text-subhead text-text-2 max-w-[280px]">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

/** Error state with a retry button. */
export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
}: {
  title?: string
  message?: string
  onRetry?: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-6 py-12 gap-3">
      <div className="w-20 h-20 grid place-items-center rounded-full bg-danger-soft text-danger mb-1">
        <AlertTriangle size={34} />
      </div>
      <h3 className="text-title font-semibold text-text">{title}</h3>
      {message && <p className="text-subhead text-text-2 max-w-[280px]">{message}</p>}
      {onRetry && (
        <Button variant="secondary" size="sm" icon={<RefreshCw size={16} />} onClick={onRetry} className="mt-1">
          Try again
        </Button>
      )}
    </div>
  )
}
