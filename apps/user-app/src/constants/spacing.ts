/**
 * Spacing scale for margins, paddings, and gaps.
 * Canonical tokens follow the design system. Legacy aliases are retained.
 */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,

  // Legacy aliases kept to avoid breaking existing screens.
  xxs: 4,
} as const;

export type Spacing = typeof spacing;
export type SpacingKey = keyof Spacing;

export function spacingValue(key: SpacingKey): number {
  return spacing[key];
}

export function withGap(key: SpacingKey) {
  return { gap: spacing[key] } as const;
}

export function withPadding(key: SpacingKey) {
  return { padding: spacing[key] } as const;
}
