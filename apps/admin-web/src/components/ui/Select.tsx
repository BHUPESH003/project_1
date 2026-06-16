import { forwardRef, type SelectHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/cn'

export interface SelectOption {
  value: string
  label: string
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  options: SelectOption[]
  placeholder?: string
  boxClassName?: string
}

/** Lightweight styled native <select> — used in filter bars and inline edits. */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, options, placeholder, className, boxClassName, disabled, ...rest },
  ref,
) {
  return (
    <label className={cn('flex flex-col gap-[7px]', disabled && 'opacity-50')}>
      {label && <span className="text-subhead font-medium text-text-2">{label}</span>}
      <span
        className={cn(
          'relative flex items-center rounded-md border-[1.5px] border-border bg-surface',
          'focus-within:border-primary focus-within:shadow-[0_0_0_3px_var(--primary-soft)]',
          boxClassName,
        )}
      >
        <select
          ref={ref}
          disabled={disabled}
          className={cn(
            'w-full appearance-none bg-transparent py-2.5 pl-3 pr-9 text-body text-text outline-none',
            className,
          )}
          {...rest}
        >
          {placeholder !== undefined && <option value="">{placeholder}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={16}
          className="pointer-events-none absolute right-3 text-text-3"
        />
      </span>
    </label>
  )
})
