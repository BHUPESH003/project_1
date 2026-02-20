import { Platform, TextStyle } from 'react-native';
import {
  WorkSans_300Light,
  WorkSans_400Regular,
  WorkSans_500Medium,
  WorkSans_600SemiBold,
  WorkSans_700Bold,
} from '@expo-google-fonts/work-sans';
import { tokens } from '@/theme/tokens';

export const workSansFonts = {
  WorkSans_300Light,
  WorkSans_400Regular,
  WorkSans_500Medium,
  WorkSans_600SemiBold,
  WorkSans_700Bold,
} as const;

export const fontFamily = {
  light: 'WorkSans_300Light',
  regular: 'WorkSans_400Regular',
  medium: 'WorkSans_500Medium',
  semibold: 'WorkSans_600SemiBold',
  bold: 'WorkSans_700Bold',
  fallback: Platform.select({
    ios: 'System',
    android: 'sans-serif',
    default: 'sans-serif',
  }),
} as const;

export const fontWeight = {
  light: '300',
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

const base = (font: string, size: number, lineHeight: number, letterSpacing = 0): TextStyle => ({
  fontFamily: font,
  fontSize: size,
  lineHeight,
  letterSpacing,
});

export const textStyles = {
  displayLarge: base(fontFamily.bold, 32, 40, -0.64),
  displayMedium: base(fontFamily.bold, 28, 36, -0.56),
  heading1: base(fontFamily.bold, 24, 32),
  heading2: base(fontFamily.semibold, 20, 28),
  heading3: base(fontFamily.semibold, 18, 24),
  bodyLarge: base(fontFamily.regular, 16, 24),
  bodyMedium: base(fontFamily.regular, 14, 20),
  bodySmall: base(fontFamily.regular, 12, 16),
  labelLarge: base(fontFamily.semibold, 14, 20, 0.28),
  labelMedium: base(fontFamily.medium, 12, 16),
  caption: {
    ...base(fontFamily.regular, 11, 14),
    color: tokens.textMuted,
  },
} as const;

// Backward-compatible aliases used by existing screens/components.
export const typography = {
  ...textStyles,
  screenTitle: textStyles.heading1,
  sectionHeader: textStyles.heading3,
  primary: textStyles.bodyLarge,
  secondary: textStyles.bodyMedium,
  meta: textStyles.bodySmall,
  overline: {
    ...textStyles.labelMedium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  } as TextStyle,
} as const;

export type TypographyVariant = keyof typeof textStyles;
export type Typography = typeof typography;
