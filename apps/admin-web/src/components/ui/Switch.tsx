import * as RadixSwitch from '@radix-ui/react-switch'
import { cn } from '@/lib/cn'

interface SwitchProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
  /** Color of the track when ON. */
  tone?: 'primary' | 'success'
  'aria-label'?: string
}

export function Switch({
  checked,
  onCheckedChange,
  disabled,
  tone = 'primary',
  'aria-label': ariaLabel,
}: SwitchProps) {
  return (
    <RadixSwitch.Root
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cn(
        'relative inline-flex h-[28px] w-[48px] shrink-0 items-center rounded-full transition-colors duration-200',
        'focus-ring disabled:opacity-50',
        checked
          ? tone === 'success'
            ? 'bg-success'
            : 'bg-primary'
          : 'bg-surface-3',
      )}
    >
      <RadixSwitch.Thumb className="block h-[22px] w-[22px] translate-x-[3px] rounded-full bg-white shadow-sm transition-transform duration-200 data-[state=checked]:translate-x-[23px]" />
    </RadixSwitch.Root>
  )
}
