import { cn } from '@/lib/cn'
import { money, toNum } from '@/lib/format'
import type { Numeric } from '@/api/types'

type Size = 'sm' | 'md' | 'lg' | 'xl'

const amtSize: Record<Size, string> = {
  sm: 'text-[16px]',
  md: 'text-[20px]',
  lg: 'text-[30px]',
  xl: 'text-[40px]',
}
const curSize: Record<Size, string> = {
  sm: 'text-[12px]',
  md: 'text-[14px]',
  lg: 'text-[18px]',
  xl: 'text-[22px]',
}

export function Price({
  amount,
  mrp,
  size = 'md',
  className,
}: {
  amount: Numeric
  mrp?: Numeric | null
  size?: Size
  className?: string
}) {
  const a = toNum(amount)
  const m = mrp != null ? toNum(mrp) : 0
  const off = m > a ? Math.round(((m - a) / m) * 100) : 0
  return (
    <span className={cn('inline-flex items-baseline gap-[7px]', className)}>
      <span className={cn('mono-num text-text-2 font-semibold', curSize[size])}>₹</span>
      <span className={cn('mono-num text-text font-bold tracking-[-0.02em]', amtSize[size])}>
        {money(a, false)}
      </span>
      {m > 0 && (
        <span className={cn('mono-num text-text-3 line-through font-normal', curSize[size])}>
          ₹{money(m, false)}
        </span>
      )}
      {off > 0 && <span className="text-success font-bold text-[0.78em]">{off}% OFF</span>}
    </span>
  )
}
