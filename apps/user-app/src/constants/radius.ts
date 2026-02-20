/**
 * Border radius scale for consistent corners.
 */
export const radius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  '3xl': 24,
  full: 9999,
  sheet: 40,
} as const;

export type Radius = typeof radius;
export type RadiusKey = keyof Radius;

export function radiusValue(key: RadiusKey): number {
  return radius[key];
}

export function rounded(key: RadiusKey) {
  return { borderRadius: radius[key] } as const;
}
