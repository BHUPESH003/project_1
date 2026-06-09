import React from 'react';
import { View, Text, StyleSheet, type ViewStyle } from 'react-native';
import { useColors } from '@/theme';
import { spacing, radius } from '@/theme/spacing';
import { fontSize, fontWeight } from '@/theme/typography';

export type BadgeVariant = 'primary' | 'success' | 'warning' | 'danger' | 'neutral' | 'accent';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  style?: ViewStyle;
  dot?: boolean;
}

export function Badge({ label, variant = 'primary', style, dot }: BadgeProps) {
  const colors = useColors();

  const { bg, text } = badgeColors(variant, colors);

  return (
    <View style={[styles.badge, { backgroundColor: bg }, style]}>
      {dot ? <View style={[styles.dot, { backgroundColor: text }]} /> : null}
      <Text style={[styles.text, { color: text }]}>{label}</Text>
    </View>
  );
}

function badgeColors(v: BadgeVariant, colors: ReturnType<typeof useColors>) {
  switch (v) {
    case 'primary':
      return { bg: colors.primarySoft, text: colors.onPrimarySoft };
    case 'success':
      return { bg: colors.successSoft, text: colors.success };
    case 'warning':
      return { bg: colors.warningSoft, text: colors.warning };
    case 'danger':
      return { bg: colors.dangerSoft, text: colors.danger };
    case 'accent':
      return { bg: colors.accentSoft, text: colors.accent };
    case 'neutral':
    default:
      return { bg: colors.surface2, text: colors.text2 };
  }
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.semibold,
  },
});
