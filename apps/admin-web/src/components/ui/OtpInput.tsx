import { useRef, type ClipboardEvent, type KeyboardEvent } from 'react'
import { cn } from '@/lib/cn'

interface OtpInputProps {
  length?: number
  value: string
  onChange: (val: string) => void
  error?: boolean
  autoFocus?: boolean
  onComplete?: (val: string) => void
}

/** Six-box OTP input with paste support and backspace navigation. */
export function OtpInput({ length = 6, value, onChange, error, autoFocus, onComplete }: OtpInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([])
  const digits = value.padEnd(length).slice(0, length).split('')

  function setDigit(i: number, d: string) {
    const clean = d.replace(/\D/g, '').slice(-1)
    const arr = value.padEnd(length).slice(0, length).split('')
    arr[i] = clean || ' '
    const next = arr.join('').replace(/\s+$/, '').trimEnd()
    const compact = arr.map((c) => (c === ' ' ? '' : c)).join('')
    onChange(compact)
    if (clean && i < length - 1) refs.current[i + 1]?.focus()
    if (compact.length === length && !compact.includes(' ')) onComplete?.(compact)
    void next
  }

  function onKeyDown(i: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[i].trim() && i > 0) {
      refs.current[i - 1]?.focus()
    }
    if (e.key === 'ArrowLeft' && i > 0) refs.current[i - 1]?.focus()
    if (e.key === 'ArrowRight' && i < length - 1) refs.current[i + 1]?.focus()
  }

  function onPaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
    if (!pasted) return
    onChange(pasted)
    const target = Math.min(pasted.length, length - 1)
    refs.current[target]?.focus()
    if (pasted.length === length) onComplete?.(pasted)
  }

  return (
    <div className="flex gap-2.5">
      {Array.from({ length }).map((_, i) => {
        const filled = digits[i].trim() !== ''
        return (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el
            }}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={1}
            autoFocus={autoFocus && i === 0}
            value={digits[i].trim()}
            onChange={(e) => setDigit(i, e.target.value)}
            onKeyDown={(e) => onKeyDown(i, e)}
            onPaste={onPaste}
            className={cn(
              'w-12 h-14 text-center text-[22px] font-bold mono-num rounded-md border-[1.5px] bg-surface text-text outline-none',
              'transition-[border-color,box-shadow,transform] [transition-timing-function:var(--ease-spring)]',
              'focus:border-primary focus:shadow-[0_0_0_3px_var(--primary-soft)] focus:-translate-y-0.5',
              filled && !error && 'border-primary bg-primary-soft',
              error ? 'border-danger shadow-[0_0_0_3px_var(--danger-soft)]' : !filled && 'border-border',
            )}
          />
        )
      })}
    </div>
  )
}
