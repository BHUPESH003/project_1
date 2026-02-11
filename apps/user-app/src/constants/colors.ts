/**
 * Brand and UI colors (dark theme). Single source of truth for components.
 * Values aligned with Stitch designs (user_home_screen, shop_selection_screen).
 */

export const colors = {
  // Brand
  primary: '#0d59f2',
  primaryShadow: 'rgba(13, 89, 242, 0.4)',
  primaryTint: 'rgba(13, 89, 242, 0.2)',
  primaryLight: 'rgba(13, 89, 242, 0.1)',

  // Backgrounds
  background: '#101622',
  backgroundDark: '#101622',
  cardDark: '#182234',
  cardDisabled: '#151c2a',
  surfaceDark: '#1C2433',
  surfaceMuted: '#1f2937',

  // Borders
  borderDark: '#314368',
  border: '#314368',
  divider: 'rgba(255, 255, 255, 0.06)',

  // Text
  textPrimary: '#ffffff',
  textSecondary: '#90a4cb',
  textMuted: '#9ca3af',
  textDisabled: '#6b7280',
  textTertiary: '#d1d5db',

  // Semantic
  success: '#22c55e',
  successLight: '#4ade80',
  successBg: 'rgba(34, 197, 94, 0.15)',
  successBorder: 'rgba(34, 197, 94, 0.3)',
  successBadgeBg: 'rgba(34, 197, 94, 0.2)',
  soonBadgeBg: 'rgba(31, 41, 55, 0.9)',
  ratingStar: '#eab308',
  orange: '#f97316',

  // UI
  white: '#ffffff',
  gray: '#6b7280',
  radioBorder: '#64748b',

  // Error / states
  error: '#dc2626',
  errorBg: 'rgba(220, 38, 38, 0.15)',
  warning: '#f59e0b',
} as const;

export type Colors = typeof colors;
