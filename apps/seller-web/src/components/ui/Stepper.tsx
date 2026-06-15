import { useEffect, useRef } from 'react'
import { Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/cn'

type Size = 'sm' | 'md' | 'lg'
const btnSize: Record<Size, string> = { sm: 'w-8 h-8', md: 'w-10 h-10', lg: 'w-11 h-11' }
const numSize: Record<Size, string> = { sm: 'min-w-[22px] text-[14px]', md: 'min-w-[28px] text-body', lg: 'min-w-[28px] text-[18px]' }

interface StepperProps {
  value: number
  onChange: (n: number) => void
  min?: number
  max?: number
  size?: Size
  variant?: 'solid' | 'accent'
  disabled?: boolean
  className?: string
}

/** Controlled quantity stepper with a bounce on the number when it changes. */
export function Stepper({
  value,
  onChange,
  min = 0,
  max = 99,
  size = 'md',
  variant = 'accent',
  disabled,
  className,
}: StepperProps) {
  const numRef = useRef<HTMLSpanElement>(null)
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    const el = numRef.current
    if (!el) return
    el.style.animation = 'none'
    void el.offsetWidth
    el.style.animation = 'step-bounce 360ms var(--ease-spring)'
  }, [value])

  const iconSize = size === 'sm' ? 16 : 18
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-sm overflow-hidden border-[1.5px]',
        variant === 'accent' ? 'bg-primary-soft border-primary' : 'bg-surface border-border',
        disabled && 'opacity-50',
        className,
      )}
    >
      <button
        type="button"
        aria-label="decrease"
        disabled={disabled || value <= min}
        onClick={() => value > min && onChange(value - 1)}
        className={cn(
          'grid place-items-center transition-transform active:scale-[0.85] disabled:opacity-40',
          variant === 'accent' ? 'text-on-primary-soft' : 'text-primary',
          btnSize[size],
        )}
      >
        <Minus size={iconSize} />
      </button>
      <span
        ref={numRef}
        className={cn('text-center font-bold mono-num', variant === 'accent' ? 'text-on-primary-soft' : 'text-text', numSize[size])}
      >
        {value}
      </span>
      <button
        type="button"
        aria-label="increase"
        disabled={disabled || value >= max}
        onClick={() => value < max && onChange(value + 1)}
        className={cn(
          'grid place-items-center transition-transform active:scale-[0.85] disabled:opacity-40',
          variant === 'accent' ? 'text-on-primary-soft' : 'text-primary',
          btnSize[size],
        )}
      >
        <Plus size={iconSize} />
      </button>
    </div>
  )
}
