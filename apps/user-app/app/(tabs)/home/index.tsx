/**
 * Home / Services screen – categories from API (ACTIVE = available, COMING_SOON = soon).
 */
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { MaterialIcons } from '@expo/vector-icons';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { ServiceCard } from '@/components/ServiceCard';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Loader } from '@/components/Loader';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { categoriesApi } from '@/api/categories.api';
import { sellersApi } from '@/api/sellers.api';
import { useLocationStore } from '@/store/location.store';

const FOOTER_HEIGHT = 100;
const FALLBACK_LOCATION_LABEL = 'Tap to set location';
const CATEGORY_PRINTING = 'printing';

const SERVICE_ICONS: Record<string, 'print' | 'edit-note' | 'construction'> = {
  printing: 'print',
  stationery: 'edit-note',
  default: 'construction',
};

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const locationCoords = useLocationStore((s) => s.coords);
  const locationLabel = useLocationStore((s) => s.coords?.label);
  const locationLoading = useLocationStore((s) => s.loading);
  const fetchLocation = useLocationStore((s) => s.fetchLocation);
  const locationDisplay = locationLabel ?? (locationCoords ? `${locationCoords.latitude.toFixed(2)}, ${locationCoords.longitude.toFixed(2)}` : FALLBACK_LOCATION_LABEL);
  const { data: categoriesData, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.getCategories(),
  });

  const { data: sellersList = [] } = useQuery({
    queryKey: ['sellers', CATEGORY_PRINTING, locationCoords?.latitude, locationCoords?.longitude],
    queryFn: () =>
      sellersApi.getAvailableSellers({
        category: CATEGORY_PRINTING,
        lat: locationCoords?.latitude,
        lng: locationCoords?.longitude,
      }),
    enabled: Boolean(locationCoords?.latitude != null && locationCoords?.longitude != null),
  });

  // Same source of truth as Explore: 0 sellers within radius = area not serviceable
  const hasLocation = locationCoords?.latitude != null && locationCoords?.longitude != null;
  const isServiceable = !hasLocation || sellersList.length > 0;

  // Normalize: API may return array or wrapped/error shape; always use an array for .map
  const categories = Array.isArray(categoriesData) ? categoriesData : [];

  const onLocationPress = () => router.push('/(tabs)/home/location-selector');
  const onPrintingPress = () => router.push('/order/upload');
  const onCreateOrder = () => router.push('/order/upload');

  const footerPaddingBottom = spacing.xl + insets.bottom;
  const availability = (status: string) => (status === 'ACTIVE' ? 'available' : 'soon');

  return (
    <ScreenWrapper>
      <View style={styles.header}>
        <Text style={styles.logo}>LocalCoord</Text>
        <TouchableOpacity
          style={styles.locationChip}
          onPress={onLocationPress}
          activeOpacity={0.85}
          disabled={locationLoading}
        >
          <MaterialIcons name="location-on" size={18} color={colors.primary} />
          <Text style={styles.locationText} numberOfLines={1}>
            {locationLoading ? 'Getting location…' : locationDisplay}
          </Text>
          <MaterialIcons name="expand-more" size={16} color={colors.textMuted} />
        </TouchableOpacity>
      </View>
      {isLoading ? (
        <View style={styles.loaderWrap}><Loader /></View>
      ) : isError ? (
        <View style={styles.errorWrap}>
          <Text style={styles.errorText}>{(error as Error)?.message ?? 'Failed to load services'}</Text>
          <TouchableOpacity onPress={() => refetch()} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: FOOTER_HEIGHT + footerPaddingBottom }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.hero}>What do you need{'\n'}done today?</Text>
        <View style={styles.grid}>
          {categories.map((c) => {
            const avail = availability(c.status);
            return (
            <TouchableOpacity
              key={c.id}
              onPress={avail === 'available' ? onPrintingPress : undefined}
              activeOpacity={avail === 'available' ? 0.88 : 1}
              style={[styles.cardWrap, avail === 'soon' && styles.cardDisabled]}
            >
              <ServiceCard
                imageSource={{ uri: `https://picsum.photos/400/225?random=${c.id}` }}
                title={c.name}
                subtitle={c.status === 'ACTIVE' ? 'Documents, Photos & Plans' : 'Coming soon'}
                availability={avail}
                iconPlaceholder={
                  <MaterialIcons
                    name={SERVICE_ICONS[c.id] ?? SERVICE_ICONS.default}
                    size={20}
                    color={avail === 'available' ? colors.primary : colors.textMuted}
                  />
                }
              />
            </TouchableOpacity>
          );})}
        </View>
        {hasLocation && !isServiceable ? (
          <View style={styles.notServiceableBox}>
            <MaterialIcons name="location-off" size={20} color={colors.error} style={styles.infoIcon} />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>We don't serve your area yet</Text>
              <Text style={styles.infoText}>
                No print shops are available within range of your current location. Change location to see if we deliver to you.
              </Text>
              <TouchableOpacity onPress={onLocationPress} style={styles.changeLocationBtn}>
                <Text style={styles.changeLocationText}>Change location</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.infoBox}>
            <MaterialIcons name="info" size={20} color={colors.primary} style={styles.infoIcon} />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Service Availability</Text>
              <Text style={styles.infoText}>
                {hasLocation
                  ? 'We serve your area. Find nearby print shops or create an order.'
                  : 'Set your location to see if we deliver to you and to find nearby shops.'}
              </Text>
            </View>
          </View>
        )}
        <TouchableOpacity
          style={styles.findShops}
          onPress={() => router.push('/(tabs)/home/sellers')}
          activeOpacity={0.85}
        >
          <Text style={styles.findShopsText}>Find nearby print shops</Text>
          <MaterialIcons name="chevron-right" size={20} color={colors.primary} />
        </TouchableOpacity>
      </ScrollView>
      )}
      <View style={[styles.footer, { paddingBottom: footerPaddingBottom }]}>
        <PrimaryButton
          label="Create Order"
          onPress={onCreateOrder}
          icon={<MaterialIcons name="add-circle" size={20} color={colors.textPrimary} />}
        />
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDark,
  },
  logo: {
    ...typography.sectionHeader,
    fontSize: 20,
    color: colors.textPrimary,
  },
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs - 2,
    backgroundColor: colors.surfaceDark,
    paddingVertical: spacing.xs - 2,
    paddingHorizontal: spacing.sm,
    paddingRight: spacing.md,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: colors.borderDark,
  },
  locationText: {
    ...typography.meta,
    fontWeight: '600',
    color: colors.textTertiary,
  },
  loaderWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  errorText: { ...typography.secondary, color: colors.error, marginBottom: spacing.md, textAlign: 'center' },
  retryBtn: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  retryText: { ...typography.secondary, fontWeight: '600', color: colors.primary },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  hero: {
    ...typography.screenTitle,
    color: colors.textPrimary,
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  cardDisabled: { opacity: 0.85 },
  cardWrap: {
    width: '48%',
    marginBottom: spacing.md,
    minWidth: 0,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: colors.primaryTint,
    borderRadius: 12,
    padding: spacing.md,
    marginTop: spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(13, 89, 242, 0.15)',
  },
  notServiceableBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderRadius: 12,
    padding: spacing.md,
    marginTop: spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  infoIcon: { marginTop: 2, marginRight: spacing.sm },
  infoContent: { flex: 1, minWidth: 0 },
  infoTitle: {
    ...typography.secondary,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xxs,
  },
  infoText: {
    ...typography.meta,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  changeLocationBtn: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  changeLocationText: {
    ...typography.secondary,
    fontWeight: '600',
    color: colors.primary,
  },
  findShops: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxs,
    paddingVertical: spacing.md,
    marginTop: spacing.md,
  },
  findShopsText: {
    ...typography.secondary,
    fontWeight: '600',
    color: colors.primary,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    backgroundColor: colors.backgroundDark,
  },
});
