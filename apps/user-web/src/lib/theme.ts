/**
 * JS mirror of the design tokens (designs/ds/tokens.css).
 * Use only where CSS variables can't reach — Razorpay theme color, Framer
 * Motion transitions, canvas, etc. For styling, prefer Tailwind utilities /
 * CSS variables.
 */
export const colors = {
  primary: '#0b8a93', // teal-600
  primaryPress: '#0d6e76', // teal-700
  primaryBright: '#10aab3', // teal-500
  accent: '#f59307', // amber-500
  success: '#059669',
  danger: '#ef4444',
  warning: '#f59e0b',
} as const

export const gradients = {
  primary: 'linear-gradient(135deg, #14b8c4 0%, #0b8a93 100%)',
  accent: 'linear-gradient(135deg, #ffc24a 0%, #f59307 100%)',
  success: 'linear-gradient(135deg, #34d399 0%, #059669 100%)',
} as const

/** Framer Motion spring presets matching the design's motion tokens. */
export const spring = {
  default: { type: 'spring', stiffness: 300, damping: 30 } as const,
  soft: { type: 'spring', stiffness: 200, damping: 25 } as const,
  sheet: { type: 'spring', damping: 28, stiffness: 240 } as const,
}

/** Page transition variants. */
export const pageTransition = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { type: 'spring', stiffness: 300, damping: 30 },
} as const

/** Staggered list variants. */
export const listContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
}
export const listItem = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0 },
}
