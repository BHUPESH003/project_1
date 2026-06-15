import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { Spinner } from './Spinner'

type Variant = 'primary' | 'secondary' | 'ghost' | 'accent' | 'danger'
type Size = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  full?: boolean
  icon?: ReactNode
  iconRight?: ReactNode
}

const sizeCls: Record<Size, string> = {
  sm: 'min-h-9 px-3.5 text-subhead rounded-sm gap-1.5',
  md: 'min-h-11 px-5 text-body rounded-md gap-2',
  lg: 'min-h-13 px-6 text-body-lg rounded-lg gap-2',
}

const variantCls: Record<Variant, string> = {
  primary: 'text-on-primary shadow-float hover:brightness-105',
  secondary:
    'bg-surface text-text border-[1.5px] border-border-strong hover:border-primary hover:text-primary',
  ghost: 'bg-transparent text-primary hover:bg-primary-soft',
  accent: 'text-on-accent hover:brightness-105',
  danger: 'bg-danger text-white hover:brightness-105',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, full, icon, iconRight, disabled, className, children, style, ...rest },
  ref,
) {
  const gradient =
    variant === 'primary'
      ? { background: 'var(--grad-primary)' }
      : variant === 'accent'
        ? { background: 'var(--grad-accent)', boxShadow: '0 6px 16px rgba(245,147,7,0.28)' }
        : undefined

  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      style={{ ...gradient, ...style }}
      className={cn(
        'relative inline-flex items-center justify-center font-semibold tracking-[-0.01em] whitespace-nowrap select-none',
        'transition-[transform,filter,box-shadow,background] duration-200 [transition-timing-function:var(--ease-spring)]',
        'active:scale-[0.97] focus-ring',
        'disabled:opacity-40 disabled:!shadow-none disabled:active:!scale-100 disabled:cursor-not-allowed',
        sizeCls[size],
        variantCls[variant],
        full && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading && (
        <span className="absolute inset-0 grid place-items-center">
          <Spinner size={size === 'sm' ? 16 : 18} />
        </span>
      )}
      <span className={cn('inline-flex items-center gap-2', loading && 'opacity-0')}>
        {icon}
        {children && <span>{children}</span>}
        {iconRight}
      </span>
    </button>
  )
})
