/**
 * Permissions screen – location and notification explanation.
 * Matches Stitch: location_permission_onboarding.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useThemeColors, useThemedStyles } from '@/theme';

export default function PermissionsScreen() {
  const colors = useThemeColors();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();

  const handleAllowLocation = () => {
    // TODO Phase 4: Request location permission
    router.replace('/(tabs)/home');
  };

  const handleManualLocation = () => {
    // TODO Phase 4: Navigate to manual location entry
    router.replace('/(tabs)/home');
  };

  return (
    <ScreenWrapper>
      <View style={styles.backRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>
      <View style={styles.center}>
        <View style={styles.iconCircle}>
          <MaterialIcons name="location-on" size={48} color={colors.primary} />
        </View>
        <Text style={styles.title}>Find shops near you</Text>
        <Text style={styles.subtitle}>
          LocalCoord needs your location to show available printing shops and estimate delivery times.
        </Text>
        <View style={styles.notificationRow}>
          <MaterialIcons name="notifications" size={20} color={colors.textMuted} />
          <Text style={styles.notificationText}>
            We may send order updates via notifications. You can change this later in settings.
          </Text>
        </View>
      </View>
      <View style={styles.actions}>
        <PrimaryButton label="Allow Location Access" onPress={handleAllowLocation} />
        <TouchableOpacity style={styles.manualButton} onPress={handleManualLocation}>
          <Text style={styles.manualText}>Enter Location Manually</Text>
        </TouchableOpacity>
      </View>
    </ScreenWrapper>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  backRow: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  notificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    maxWidth: 320,
  },
  notificationText: {
    fontSize: 13,
    color: colors.textMuted,
    flex: 1,
  },
  actions: {
    gap: 12,
    paddingBottom: 24,
  },
  manualButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  manualText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textTertiary,
  },
});
