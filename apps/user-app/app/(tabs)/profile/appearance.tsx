import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { useThemeColors, useThemedStyles } from '@/theme';
import { useThemeStore } from '@/theme/theme.store';
import type { ThemeMode } from '@/theme';

const OPTIONS: { label: string; value: ThemeMode; description: string }[] = [
  { label: 'System', value: 'system', description: 'Follow your device appearance' },
  { label: 'Light', value: 'light', description: 'Always use light mode' },
  { label: 'Dark', value: 'dark', description: 'Always use dark mode' },
];

export default function AppearanceScreen() {
  const colors = useThemeColors();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const themeMode = useThemeStore((s) => s.themeMode);
  const setThemeMode = useThemeStore((s) => s.setThemeMode);

  return (
    <ScreenWrapper>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Appearance</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        {OPTIONS.map((option) => {
          const selected = themeMode === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              activeOpacity={0.85}
              style={[styles.optionRow, selected && styles.optionRowSelected]}
              onPress={() => setThemeMode(option.value)}
            >
              <View style={styles.optionTextWrap}>
                <Text style={styles.optionLabel}>{option.label}</Text>
                <Text style={styles.optionDescription}>{option.description}</Text>
              </View>
              {selected ? (
                <MaterialIcons name="check-circle" size={22} color={colors.primary} />
              ) : (
                <View style={styles.unselectedDot} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </ScreenWrapper>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderDark,
    },
    backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    title: { ...typography.sectionHeader, color: colors.textPrimary, textAlign: 'center', flex: 1 },
    placeholder: { width: 40 },
    content: {
      paddingTop: spacing.lg,
      gap: spacing.md,
    },
    optionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: 1,
      borderColor: colors.borderDark,
      borderRadius: 12,
      backgroundColor: colors.surfaceDark,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
    },
    optionRowSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryLight,
    },
    optionTextWrap: {
      flex: 1,
      marginRight: spacing.sm,
    },
    optionLabel: {
      ...typography.primary,
      color: colors.textPrimary,
    },
    optionDescription: {
      ...typography.meta,
      color: colors.textSecondary,
      marginTop: spacing.xxs,
    },
    unselectedDot: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.borderDark,
      backgroundColor: colors.surfaceDark,
    },
  });
