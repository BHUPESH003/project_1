import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface ChipProps {
  active?: boolean
  icon?: ReactNode
  count?: number
  dot?: 'success' | 'danger' | 'warning'
  onClick?: () => void
  disabled?: boolean
  children: ReactNode
  className?: string
}

const dotColor = {
  success: 'bg-success',
  danger: 'bg-danger',
  warning: 'bg-warning',
}

export function Chip({ active, icon, count, dot, onClick, disabled, children, className }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full border-[1.5px] text-subhead font-medium whitespace-nowrap',
        'transition-[transform,background,border-color,color] [transition-timing-function:var(--ease-spring)] active:scale-95',
        'disabled:opacity-40',
        active
          ? 'bg-primary-soft border-primary text-on-primary-soft'
          : 'bg-surface border-border text-text',
        className,
      )}
    >
      {dot && <span className={cn('w-[7px] h-[7px] rounded-full shrink-0', dotColor[dot])} />}
      {icon && <span className={cn('inline-flex', active ? 'text-on-primary-soft' : 'text-text-2')}>{icon}</span>}
      <span>{children}</span>
      {count != null && (
        <span className="text-caption bg-surface-2 px-1.5 py-px rounded-full mono-num">{count}</span>
      )}
    </button>
  )
}
