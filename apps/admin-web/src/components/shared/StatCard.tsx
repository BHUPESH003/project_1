import type { ReactNode } from 'react'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Skeleton } from '@/components/ui/Skeleton'

interface StatCardProps {
  label: string
  value: ReactNode
  icon?: ReactNode
  /** Sub-line under the value (e.g. "8 / 23 online"). */
  hint?: ReactNode
  /** Percent change vs previous period; renders a coloured trend pill. */
  trend?: number | null
  loading?: boolean
  /** Tint the card to draw attention (e.g. pending approvals > 0). */
  accent?: 'default' | 'warning' | 'danger'
}

const accentCls = {
  default: 'border-border',
  warning: 'border-warning/40 bg-warning-soft',
  danger: 'border-danger/40 bg-danger-soft',
}

export function StatCard({
  label,
  value,
  icon,
  hint,
  trend,
  loading,
  accent = 'default',
}: StatCardProps) {
  return (
    <div className={cn('rounded-xl border bg-surface p-5', accentCls[accent])}>
      <div className="flex items-center justify-between">
        <span className="text-subhead font-medium text-text-2">{label}</span>
        {icon && <span className="text-text-3">{icon}</span>}
      </div>
      {loading ? (
        <Skeleton className="mt-3 h-8 w-24" />
      ) : (
        <div className="mt-2 flex items-end gap-2">
          <span className="text-display font-extrabold tracking-[-0.02em] text-text tabular-nums">
            {value}
          </span>
          {trend != null && (
            <span
              className={cn(
                'mb-1.5 inline-flex items-center gap-0.5 text-caption font-semibold',
                trend >= 0 ? 'text-success' : 'text-danger',
              )}
            >
              {trend >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
              {Math.abs(trend)}%
            </span>
          )}
        </div>
      )}
      {hint && !loading && <p className="mt-1 text-caption text-text-3">{hint}</p>}
    </div>
  )
}
