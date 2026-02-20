/**
 * No sellers available – empty state. Matches Stitch: shop_selection_screen_2.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { PrimaryButton } from '@/components/PrimaryButton';
import { TouchableOpacity } from 'react-native';
import { useThemeColors, useThemedStyles } from '@/theme';

export default function NoSellersScreen() {
  const colors = useThemeColors();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();

  return (
    <ScreenWrapper>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Nearby Print Shops</Text>
        <View style={styles.placeholder} />
      </View>
      <View style={styles.content}>
        <View style={styles.iconBox}>
          <MaterialIcons name="storefront" size={64} color={colors.textMuted} />
        </View>
        <Text style={styles.message}>No nearby shops available</Text>
        <View style={styles.actions}>
          <PrimaryButton label="Change Location" onPress={() => router.push('/(tabs)/home/location-selector')} />
          <TouchableOpacity style={styles.tryAgain} onPress={() => router.back()}>
            <Text style={styles.tryAgainText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScreenWrapper>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDark,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  placeholder: { width: 40 },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  iconBox: {
    width: 240,
    aspectRatio: 4 / 3,
    backgroundColor: colors.surfaceDark,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  message: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 32,
  },
  actions: {
    width: '100%',
    maxWidth: 320,
    gap: 16,
  },
  tryAgain: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  tryAgainText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
});
