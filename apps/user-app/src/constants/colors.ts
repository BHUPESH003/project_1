/**
 * Compatibility bridge for legacy color imports.
 * New code should use `useThemeColors()` from `@/theme`.
 */

import { darkTheme } from '@/theme';
import { tokens } from '@/theme/tokens';

const base = darkTheme.colors;

export const colors = {
  // Design tokens
  ...tokens,

  // Semantic theme values (dark default for compatibility)
  ...base,

  // Legacy aliases retained during migration
  background: base.background,
  cardDark: base.surfaceDark,
  border: base.border,
} as const;

export type Colors = typeof colors;
