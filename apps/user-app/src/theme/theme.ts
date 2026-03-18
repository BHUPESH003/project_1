import { tokens } from './tokens';
import type { AppTheme, ResolvedThemeMode, ThemeColors, ThemeMode } from './types';

const lightColors: ThemeColors = {
  primary: tokens.primary,
  primaryDark: tokens.primaryDark,
  primaryLight: tokens.primaryLight,
  primaryGlow: tokens.primaryGlow,

  background: tokens.backgroundDark,
  backgroundLight: tokens.backgroundLight,
  backgroundDark: tokens.backgroundDark,
  surface: tokens.surfaceLight,
  surfaceLight: tokens.surfaceLight,
  surfaceDark: tokens.surfaceDark,

  textPrimary: tokens.textPrimary,
  textSecondary: tokens.textSecondary,
  textMuted: tokens.textMuted,
  textLight: tokens.textLight,
  textDark: tokens.textDark,

  border: tokens.borderDark,
  borderLight: tokens.borderDark,
  borderDark: tokens.borderDark,

  success: tokens.success,
  error: tokens.error,
  warning: tokens.warning,
  info: tokens.info,

  divider: 'rgba(255, 255, 255, 0.1)',
  cardDisabled: '#1a1a1a',
  surfaceMuted: '#1a1a1a',
  radioBorder: '#333333',

  primaryTint: tokens.primaryLight,
  primaryShadow: tokens.primaryGlow,
  errorBg: 'rgba(239, 68, 68, 0.15)',
  successLight: '#34d399',
  successBg: 'rgba(16, 185, 129, 0.15)',
  successBorder: 'rgba(16, 185, 129, 0.3)',
  successBadgeBg: 'rgba(16, 185, 129, 0.2)',
  warningBg: 'rgba(245, 158, 11, 0.2)',
  infoBg: 'rgba(59, 130, 246, 0.2)',
  soonBadgeBg: 'rgba(245, 245, 245, 0.9)',
  ratingStar: '#eab308',
  orange: '#f97316',

  white: '#ffffff',
  gray: '#666666',
  textDisabled: '#666666',
  textTertiary: '#999999',
};

const darkColors: ThemeColors = {
  primary: tokens.primary,
  primaryDark: tokens.primaryDark,
  primaryLight: tokens.primaryLight,
  primaryGlow: tokens.primaryGlow,

  background: tokens.backgroundDark,
  backgroundLight: tokens.backgroundLight,
  backgroundDark: tokens.backgroundDark,
  surface: tokens.surfaceLight,
  surfaceLight: tokens.surfaceLight,
  surfaceDark: tokens.surfaceDark,

  textPrimary: tokens.textPrimary,
  textSecondary: tokens.textSecondary,
  textMuted: tokens.textMuted,
  textLight: tokens.textLight,
  textDark: tokens.textDark,

  border: tokens.borderDark,
  borderLight: tokens.borderDark,
  borderDark: tokens.borderDark,

  success: tokens.success,
  error: tokens.error,
  warning: tokens.warning,
  info: tokens.info,

  divider: 'rgba(255, 255, 255, 0.1)',
  cardDisabled: '#1a1a1a',
  surfaceMuted: '#1a1a1a',
  radioBorder: '#333333',

  primaryTint: tokens.primaryLight,
  primaryShadow: tokens.primaryGlow,
  errorBg: 'rgba(239, 68, 68, 0.15)',
  successLight: '#34d399',
  successBg: 'rgba(16, 185, 129, 0.15)',
  successBorder: 'rgba(16, 185, 129, 0.3)',
  successBadgeBg: 'rgba(16, 185, 129, 0.2)',
  warningBg: 'rgba(245, 158, 11, 0.2)',
  infoBg: 'rgba(59, 130, 246, 0.2)',
  soonBadgeBg: 'rgba(245, 245, 245, 0.9)',
  ratingStar: '#eab308',
  orange: '#f97316',

  white: '#ffffff',
  gray: '#666666',
  textDisabled: '#666666',
  textTertiary: '#999999',
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
