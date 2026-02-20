import { Platform, ViewStyle } from 'react-native';
import type { ThemeColors } from '@/theme';

export type ShadowPreset = 'none' | 'sm' | 'md' | 'lg' | 'glow' | 'inner';

/**
 * Shadow preset system.
 * `inner` is a simulated inset effect using border/background styling.
 */
export function getShadowPresets(colors: ThemeColors) {
  const none: ViewStyle = {};

  const sm: ViewStyle =
    Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
      default: {},
    }) ?? {};

  const md: ViewStyle =
    Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
      default: {},
    }) ?? {};

  const lg: ViewStyle =
    Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
      },
      android: {
        elevation: 6,
      },
      default: {},
    }) ?? {};

  const glow: ViewStyle =
    Platform.select({
      ios: {
        shadowColor: '#0df2f2',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
      },
      android: {
        elevation: 4,
      },
      default: {},
    }) ?? {};

  const inner: ViewStyle = {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  };

  return { none, sm, md, lg, glow, inner } as const;
}

export type ShadowPresets = ReturnType<typeof getShadowPresets>;

export function getShadow(preset: ShadowPreset, colors: ThemeColors): ViewStyle {
  return getShadowPresets(colors)[preset];
}

/**
 * Backward-compatible elevation mapping used by existing components.
 * Prefer `getShadowPresets()` in new code.
 */
export function getElevation(colors: ThemeColors) {
  const shadow = getShadowPresets(colors);
  return {
    card: shadow.sm,
    cardSelected: shadow.md,
    button: shadow.glow,
  } as const;
}

export type Elevation = ReturnType<typeof getElevation>;
