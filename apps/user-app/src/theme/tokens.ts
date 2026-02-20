export const tokens = {
  primary: '#0df2f2',
  primaryDark: '#00dada',
  primaryLight: 'rgba(13, 242, 242, 0.1)',
  primaryGlow: 'rgba(13, 242, 242, 0.5)',

  backgroundLight: '#f5f8f8',
  backgroundDark: '#102222',
  surfaceLight: '#ffffff',
  surfaceDark: '#152a2a',

  textPrimary: '#111827',
  textSecondary: '#6b7280',
  textMuted: '#9ca3af',
  textLight: '#ffffff',
  textDark: '#1f2937',

  borderLight: '#e5e7eb',
  borderDark: '#374151',

  success: '#10b981',
  error: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
} as const;

export type ThemeTokens = typeof tokens;
