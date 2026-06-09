import { Platform } from 'react-native';

// System font stack — SF Pro on iOS, Roboto on Android
export const fontFamily = {
  sans: Platform.select({ ios: 'System', android: 'Roboto', default: 'System' }),
  mono: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
};

// Type scale (matches design tokens)
export const fontSize = {
  displayLg: 34,
  display:   28,
  titleLg:   22,
  title:     17,
  bodyLg:    16,
  body:      15,
  subhead:   13,
  caption:   12,
  micro:     11,
} as const;

// Weight constants
export const fontWeight = {
  regular:  '400' as const,
  medium:   '500' as const,
  semibold: '600' as const,
  bold:     '700' as const,
};

// Line heights
export const lineHeight = {
  displayLg: 40,
  display:   34,
  titleLg:   28,
  title:     22,
  bodyLg:    24,
  body:      22,
  subhead:   18,
  caption:   16,
  micro:     14,
} as const;

// Predefined text style presets for AppText variants
export type TypographyVariant =
  | 'displayLg'
  | 'display'
  | 'titleLg'
  | 'title'
  | 'bodyLg'
  | 'body'
  | 'subhead'
  | 'caption'
  | 'micro'
  | 'price'
  | 'priceSmall';

export const typographyVariants: Record<TypographyVariant, object> = {
  displayLg: { fontSize: fontSize.displayLg, lineHeight: lineHeight.displayLg, fontWeight: fontWeight.bold },
  display:   { fontSize: fontSize.display,   lineHeight: lineHeight.display,   fontWeight: fontWeight.bold },
  titleLg:   { fontSize: fontSize.titleLg,   lineHeight: lineHeight.titleLg,   fontWeight: fontWeight.semibold },
  title:     { fontSize: fontSize.title,     lineHeight: lineHeight.title,     fontWeight: fontWeight.semibold },
  bodyLg:    { fontSize: fontSize.bodyLg,    lineHeight: lineHeight.bodyLg,    fontWeight: fontWeight.regular },
  body:      { fontSize: fontSize.body,      lineHeight: lineHeight.body,      fontWeight: fontWeight.regular },
  subhead:   { fontSize: fontSize.subhead,   lineHeight: lineHeight.subhead,   fontWeight: fontWeight.medium },
  caption:   { fontSize: fontSize.caption,   lineHeight: lineHeight.caption,   fontWeight: fontWeight.regular },
  micro:     { fontSize: fontSize.micro,     lineHeight: lineHeight.micro,     fontWeight: fontWeight.regular },
  // Monospaced for prices
  price:     { fontSize: fontSize.display,   lineHeight: lineHeight.display,   fontWeight: fontWeight.bold, fontVariant: ['tabular-nums'] },
  priceSmall:{ fontSize: fontSize.body,      lineHeight: lineHeight.body,      fontWeight: fontWeight.semibold, fontVariant: ['tabular-nums'] },
};
