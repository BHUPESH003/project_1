export type ThemeMode = 'system' | 'light' | 'dark';

export type ResolvedThemeMode = 'light' | 'dark';

export interface ThemeColors {
  primary: string;
  primaryDark: string;
  primaryLight: string;
  primaryGlow: string;

  background: string;
  backgroundLight: string;
  backgroundDark: string;
  surface: string;
  surfaceLight: string;
  surfaceDark: string;

  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textLight: string;
  textDark: string;

  border: string;
  borderLight: string;
  borderDark: string;

  success: string;
  error: string;
  warning: string;
  info: string;

  divider: string;
  cardDisabled: string;
  surfaceMuted: string;
  radioBorder: string;

  primaryTint: string;
  primaryShadow: string;
  errorBg: string;
  successLight: string;
  successBg: string;
  successBorder: string;
  successBadgeBg: string;
  warningBg: string;
  infoBg: string;
  soonBadgeBg: string;
  ratingStar: string;
  orange: string;

  white: string;
  black: string;
  gray: string;
  textDisabled: string;
  textTertiary: string;
}

export interface AppTheme {
  mode: ThemeMode;
  resolvedMode: ResolvedThemeMode;
  colors: ThemeColors;
}
