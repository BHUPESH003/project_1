/**
 * Location selector – use device location (expo-location). No backend addresses in MVP.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, TextInput, Platform, Alert } from 'react-native';
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

  const [searchQuery, setSearchQuery] = React.useState('');
  const [isSearching, setIsSearching] = React.useState(false);

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

  const handleManualSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const results = await Location.geocodeAsync(searchQuery);
      if (results.length > 0) {
        const { latitude, longitude } = results[0];
        useLocationStore.getState().setCoords({ latitude, longitude, label: searchQuery });
        setLabel(searchQuery);
        router.back();
      } else {
        Alert.alert('No results found for this address. Please try a different search.');
      }
    } catch (err) {
      Alert.alert('Search failed. Please try again.');
    } finally {
      setIsSearching(false);
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
        {/* Manual Search */}
        <View style={[styles.searchContainer, { borderColor: colors.border }]}>
          <MaterialIcons name="search" size={20} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.black }]}
            placeholder="Search for area, street, or landmark"
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleManualSearch}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <MaterialIcons name="close" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={styles.row}
          onPress={handleUseCurrentLocation}
          disabled={loading}
          activeOpacity={0.85}
        >
          {(loading || isSearching) ? (
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
    backgroundColor: colors.background,
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: Platform.OS === 'ios' ? spacing.sm : 0,
    marginBottom: spacing.lg,
  },
  searchIcon: {
    marginRight: spacing.xs,
  },
  searchInput: {
    flex: 1,
    height: 44,
    ...typography.primary,
  },
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
