export const tokens = {
  primary: '#20b2aa',
  primaryDark: '#1a9a92',
  primaryLight: 'rgba(32, 178, 170, 0.1)',
  primaryGlow: 'rgba(32, 178, 170, 0.5)',

  backgroundLight: '#ffffff',
  backgroundDark: '#0a0a0a',
  surfaceLight: '#ffffff',
  surfaceDark: '#0a0a0a',

  textPrimary: '#ffffff',
  textSecondary: '#b3b3b3',
  textMuted: '#808080',
  textLight: '#ffffff',
  textDark: '#1f2937',

  borderLight: '#333333',
  borderDark: '#1a1a1a',

  success: '#10b981',
  error: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
  black: '#000000',
} as const;

export type ThemeTokens = typeof tokens;
