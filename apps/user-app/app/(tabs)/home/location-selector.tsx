/**
 * Location selector – use device location (expo-location). No backend addresses in MVP.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { MaterialIcons } from '@expo/vector-icons';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { useThemeColors, useThemedStyles } from '@/theme';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { useLocationStore } from '@/store/location.store';

export default function LocationSelectorScreen() {
  const colors = useThemeColors();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const fetchLocation = useLocationStore((s) => s.fetchLocation);
  const setLabel = useLocationStore((s) => s.setLabel);
  const loading = useLocationStore((s) => s.loading);
  const error = useLocationStore((s) => s.error);

  const handleUseCurrentLocation = async () => {
    const coords = await fetchLocation();
    if (coords) {
      try {
        const [address] = await Location.reverseGeocodeAsync({
          latitude: coords.latitude,
          longitude: coords.longitude,
        });
        const label = address
          ? [address.city, address.region, address.district].filter(Boolean).join(', ') || `${coords.latitude.toFixed(2)}, ${coords.longitude.toFixed(2)}`
          : `${coords.latitude.toFixed(2)}, ${coords.longitude.toFixed(2)}`;
        setLabel(label);
      } catch {
        setLabel(`${coords.latitude.toFixed(2)}, ${coords.longitude.toFixed(2)}`);
      }
      router.back();
    }
  };

  return (
    <ScreenWrapper>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Select Location</Text>
        <View style={styles.placeholder} />
      </View>
      <View style={styles.content}>
        <TouchableOpacity
          style={styles.row}
          onPress={handleUseCurrentLocation}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <MaterialIcons name="my-location" size={24} color={colors.primary} />
          )}
          <View style={styles.rowText}>
            <Text style={styles.rowLabel}>Use current location</Text>
            <Text style={styles.rowSubtitle}>We'll use your device location for nearby shops</Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color={colors.textMuted} />
        </TouchableOpacity>
        {error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : null}
      </View>
    </ScreenWrapper>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
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
    ...typography.sectionHeader,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  placeholder: { width: 40 },
  content: { padding: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    gap: spacing.sm,
  },
  rowText: { flex: 1 },
  rowLabel: {
    ...typography.primary,
    color: colors.textPrimary,
  },
  rowSubtitle: {
    ...typography.meta,
    color: colors.textMuted,
    marginTop: 2,
  },
  errorText: {
    ...typography.secondary,
    color: colors.error,
    marginTop: spacing.sm,
  },
});
