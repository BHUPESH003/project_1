import { tokens } from './tokens';
import type { AppTheme, ResolvedThemeMode, ThemeColors, ThemeMode } from './types';

const lightColors: ThemeColors = {
  primary: tokens.primary,
  primaryDark: tokens.primaryDark,
  primaryLight: tokens.primaryLight,
  primaryGlow: tokens.primaryGlow,

  background: tokens.backgroundLight,
  backgroundLight: tokens.backgroundLight,
  // Legacy dark-suffixed keys map to active surface in light mode.
  backgroundDark: tokens.backgroundLight,
  surface: tokens.surfaceLight,
  surfaceLight: tokens.surfaceLight,
  surfaceDark: tokens.surfaceLight,

  textPrimary: tokens.textPrimary,
  textSecondary: tokens.textSecondary,
  textMuted: tokens.textMuted,
  textLight: tokens.textLight,
  textDark: tokens.textDark,

  border: tokens.borderLight,
  borderLight: tokens.borderLight,
  borderDark: tokens.borderLight,

  success: tokens.success,
  error: tokens.error,
  warning: tokens.warning,
  info: tokens.info,

  divider: 'rgba(17, 24, 39, 0.08)',
  cardDisabled: '#edf2f2',
  surfaceMuted: '#eef4f4',
  radioBorder: '#64748b',

  primaryTint: tokens.primaryLight,
  primaryShadow: tokens.primaryGlow,
  errorBg: 'rgba(239, 68, 68, 0.15)',
  successLight: '#34d399',
  successBg: 'rgba(16, 185, 129, 0.15)',
  successBorder: 'rgba(16, 185, 129, 0.3)',
  successBadgeBg: 'rgba(16, 185, 129, 0.2)',
  warningBg: 'rgba(245, 158, 11, 0.2)',
  infoBg: 'rgba(59, 130, 246, 0.2)',
  soonBadgeBg: 'rgba(229, 231, 235, 0.9)',
  ratingStar: '#eab308',
  orange: '#f97316',

  white: '#ffffff',
  gray: '#6b7280',
  textDisabled: '#9ca3af',
  textTertiary: '#4b5563',
};

const darkColors: ThemeColors = {
  primary: tokens.primary,
  primaryDark: tokens.primaryDark,
  primaryLight: tokens.primaryLight,
  primaryGlow: tokens.primaryGlow,

  background: tokens.backgroundDark,
  backgroundLight: tokens.backgroundLight,
  backgroundDark: tokens.backgroundDark,
  surface: tokens.surfaceDark,
  surfaceLight: tokens.surfaceLight,
  surfaceDark: tokens.surfaceDark,

  // Semantic swap: textPrimary becomes light text in dark mode.
  textPrimary: tokens.textLight,
  textSecondary: tokens.textMuted,
  textMuted: '#94a3b8',
  textLight: tokens.textLight,
  textDark: tokens.textDark,

  border: tokens.borderDark,
  borderLight: tokens.borderLight,
  borderDark: tokens.borderDark,

  success: tokens.success,
  error: tokens.error,
  warning: tokens.warning,
  info: tokens.info,

  divider: 'rgba(255, 255, 255, 0.08)',
  cardDisabled: '#0f1f1f',
  surfaceMuted: '#1f2937',
  radioBorder: '#64748b',

  primaryTint: tokens.primaryLight,
  primaryShadow: tokens.primaryGlow,
  errorBg: 'rgba(239, 68, 68, 0.15)',
  successLight: '#34d399',
  successBg: 'rgba(16, 185, 129, 0.15)',
  successBorder: 'rgba(16, 185, 129, 0.3)',
  successBadgeBg: 'rgba(16, 185, 129, 0.2)',
  warningBg: 'rgba(245, 158, 11, 0.2)',
  infoBg: 'rgba(59, 130, 246, 0.2)',
  soonBadgeBg: 'rgba(31, 41, 55, 0.9)',
  ratingStar: '#eab308',
  orange: '#f97316',

  white: '#ffffff',
  gray: '#6b7280',
  textDisabled: '#6b7280',
  textTertiary: '#d1d5db',
};

export const lightTheme: AppTheme = {
  mode: 'light',
  resolvedMode: 'light',
  colors: lightColors,
};

export const darkTheme: AppTheme = {
  mode: 'dark',
  resolvedMode: 'dark',
  colors: darkColors,
};

export function getTheme(resolvedMode: ResolvedThemeMode, mode: ThemeMode = resolvedMode): AppTheme {
  const base = resolvedMode === 'dark' ? darkTheme : lightTheme;
  return {
    mode,
    resolvedMode,
    colors: base.colors,
  };
}
