import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import type { BadgeTone } from '@/lib/constants'

interface BadgeProps {
  tone?: BadgeTone
  soft?: boolean
  icon?: ReactNode
  children: ReactNode
  className?: string
}

const softCls: Record<BadgeTone, string> = {
  success: 'bg-success-soft text-success',
  danger: 'bg-danger-soft text-danger',
  warning: 'bg-warning-soft text-warning',
  primary: 'bg-primary-soft text-on-primary-soft',
  neutral: 'bg-surface-2 text-text-2',
}
const solidCls: Record<BadgeTone, string> = {
  success: 'bg-success text-white',
  danger: 'bg-danger text-white',
  warning: 'bg-warning text-[#3a2604]',
  primary: 'bg-primary text-on-primary',
  neutral: 'bg-surface-inverse text-on-inverse',
}

export function Badge({ tone = 'neutral', soft = true, icon, children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-[5px] px-2.5 py-1 rounded-full text-caption font-semibold tracking-[0.01em] leading-none',
        soft ? softCls[tone] : solidCls[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  )
}
