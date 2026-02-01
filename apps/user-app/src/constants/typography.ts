/**
 * Typography hierarchy: screen title, section, primary, secondary, meta.
 * Line heights tuned for readability and vertical rhythm.
 */
import { Platform } from 'react-native';

export const typography = {
  // Screen title – hero / main heading
  screenTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    lineHeight: 32,
    letterSpacing: -0.25,
  },
  // Section header – e.g. "Nearby Print Shops"
  sectionHeader: {
    fontSize: 18,
    fontWeight: '700' as const,
    lineHeight: 24,
    letterSpacing: -0.2,
  },
  // Primary text – cards, list items
  primary: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
  // Secondary / body
  secondary: {
    fontSize: 14,
    fontWeight: '500' as const,
    lineHeight: 20,
  },
  // Meta / captions, labels
  meta: {
    fontSize: 12,
    fontWeight: '500' as const,
    lineHeight: 16,
  },
  // Overline / uppercase labels
  overline: {
    fontSize: 10,
    fontWeight: '700' as const,
    lineHeight: 14,
    letterSpacing: 0.5,
  },
} as const;

// Platform-specific font stack (optional; React Native uses system by default)
export const fontFamily = Platform.select({
  ios: { fontFamily: 'System' },
  android: { fontFamily: 'System' },
  default: {},
});

export type Typography = typeof typography;
