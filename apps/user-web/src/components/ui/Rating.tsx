import { Star } from 'lucide-react'
import { cn } from '@/lib/cn'
import { toNum } from '@/lib/format'
import type { Numeric } from '@/api/types'

export function Rating({
  value,
  count,
  size = 'md',
  className,
}: {
  value: Numeric | null | undefined
  count?: number
  size?: 'sm' | 'md'
  className?: string
}) {
  const v = toNum(value)
  if (!v) return null
  const px = size === 'sm' ? 12 : 14
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-semibold',
        size === 'sm' ? 'text-caption' : 'text-subhead',
        className,
      )}
    >
      <Star size={px} className="text-success fill-success" />
      <span className="mono-num text-text">{v.toFixed(1)}</span>
      {count != null && <span className="mono-num text-text-3 font-normal">({count})</span>}
    </span>
  )
}
