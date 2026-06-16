import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
  error?: string
  leading?: ReactNode
  trailing?: ReactNode
  boxClassName?: string
}

export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, hint, error, leading, trailing, className, boxClassName, disabled, ...rest },
  ref,
) {
  return (
    <label className={cn('flex flex-col gap-[7px] w-full', disabled && 'opacity-50 pointer-events-none')}>
      {label && <span className="text-subhead font-medium text-text-2">{label}</span>}
      <span
        className={cn(
          'flex items-center gap-2.5 min-h-[50px] px-3.5 bg-surface border-[1.5px] rounded-md transition-[border-color,box-shadow]',
          'focus-within:border-primary focus-within:shadow-[0_0_0_3px_var(--primary-soft)]',
          error ? 'border-danger focus-within:shadow-[0_0_0_3px_var(--danger-soft)]' : 'border-border',
          boxClassName,
        )}
      >
        {leading && <span className="text-text-3 inline-flex shrink-0">{leading}</span>}
        <input
          ref={ref}
          disabled={disabled}
          className={cn(
            'flex-1 min-w-0 border-none outline-none bg-transparent text-body text-text placeholder:text-text-3',
            className,
          )}
          {...rest}
        />
        {trailing && <span className="text-text-3 inline-flex shrink-0">{trailing}</span>}
      </span>
      {(hint || error) && (
        <span className={cn('text-caption', error ? 'text-danger' : 'text-text-3')}>{error || hint}</span>
      )}
    </label>
  )
})
