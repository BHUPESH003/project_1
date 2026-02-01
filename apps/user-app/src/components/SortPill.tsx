/**
 * SortPill – filter/sort chip. Polish: spacing, typography, elevation when active.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../constants/colors';
import { spacing } from '../constants/spacing';
import { typography } from '../constants/typography';

export type SortPillLabel = 'Recommended' | 'Lowest Price' | 'Fastest';

export interface SortPillProps {
  label: SortPillLabel;
  active: boolean;
}

const LABELS: Record<SortPillLabel, string> = {
  Recommended: 'Recommended',
  'Lowest Price': 'Lowest Price',
  Fastest: 'Fastest',
};

export const SortPill: React.FC<SortPillProps> = ({ label, active }) => {
  return (
    <View style={[styles.pill, active ? styles.pillActive : styles.pillInactive]}>
      <Text style={[styles.text, active ? styles.textActive : styles.textInactive]}>
        {LABELS[label]}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  pill: {
    height: 36,
    paddingHorizontal: spacing.md,
    borderRadius: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pillActive: {
    backgroundColor: colors.primary,
  },
  pillInactive: {
    backgroundColor: colors.surfaceDark,
    borderWidth: 1,
    borderColor: colors.borderDark,
  },
  text: {
    ...typography.secondary,
  },
  textActive: {
    color: colors.textPrimary,
  },
  textInactive: {
    color: colors.textTertiary,
  },
});

export default SortPill;
