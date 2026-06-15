import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

type Variant = 'secondary' | 'ghost' | 'soft' | 'glass'
type Size = 'sm' | 'md' | 'lg'

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  badge?: number | string
  children: ReactNode
}

const sizeCls: Record<Size, string> = {
  sm: 'w-9 h-9 rounded-md',
  md: 'w-11 h-11 rounded-md',
  lg: 'w-13 h-13 rounded-lg',
}
const variantCls: Record<Variant, string> = {
  secondary: 'bg-surface border-border hover:border-border-strong',
  ghost: 'bg-transparent border-transparent hover:bg-surface-2',
  soft: 'bg-primary-soft text-on-primary-soft border-transparent',
  glass: 'glass',
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { variant = 'secondary', size = 'md', badge, className, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        'relative inline-grid place-items-center border-[1.5px] text-text cursor-pointer',
        'transition-[transform,background,border-color] duration-200 [transition-timing-function:var(--ease-spring)] active:scale-90 focus-ring',
        sizeCls[size],
        variantCls[variant],
        className,
      )}
      {...rest}
    >
      {children}
      {badge != null && (
        <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1.5 grid place-items-center rounded-full bg-accent text-on-accent text-[10px] font-bold border-2 border-surface mono-num">
          {badge}
        </span>
      )}
    </button>
  )
})
