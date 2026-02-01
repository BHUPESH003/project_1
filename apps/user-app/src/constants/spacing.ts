/**
 * Spacing scale (4 / 8 / 12 / 16 / 24 / 32).
 * Single source for padding, margins, and vertical rhythm.
 */
export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export type Spacing = typeof spacing;
