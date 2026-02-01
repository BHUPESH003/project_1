/**
 * Nearby sellers (print shops) – from API (ONLINE only). Sort client-side; no sellers → no-sellers.
 */
import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, LayoutAnimation, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { MaterialIcons } from '@expo/vector-icons';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { ShopCard } from '@/components/ShopCard';
import { SortPill } from '@/components/SortPill';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Loader } from '@/components/Loader';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { sellersApi, type SellerListItem } from '@/api/sellers.api';
import { useLocationStore } from '@/store/location.store';

// LayoutAnimation works without setLayoutAnimationEnabledExperimental on New Architecture (no-op there)

type SortLabel = 'Recommended' | 'Lowest Price' | 'Fastest';
const CATEGORY_PRINTING = 'printing';
const FOOTER_HEIGHT = 100;

function mapSellerToCard(s: SellerListItem) {
  return {
    id: s.seller_id,
    name: s.shop_name,
    pricePerUnit: String(s.price_breakdown?.per_page ?? 0),
    distance: s.distance_km != null ? `${s.distance_km} km` : '—',
    eta: `${s.prep_time_min ?? 0} min`,
  };
}

export default function SellersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [sort, setSort] = useState<SortLabel>('Recommended');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const coords = useLocationStore((s) => s.coords);

  const hasCoords = coords?.latitude != null && coords?.longitude != null;
  const { data: list = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ['sellers', CATEGORY_PRINTING, coords?.latitude, coords?.longitude],
    queryFn: () =>
      sellersApi.getAvailableSellers({
        category: CATEGORY_PRINTING,
        lat: coords?.latitude,
        lng: coords?.longitude,
      }),
    enabled: hasCoords,
  });

  const shops = useMemo(() => list.map(mapSellerToCard), [list]);
  const sortedShops = useMemo(() => {
    if (sort === 'Lowest Price') return [...shops].sort((a, b) => Number(a.pricePerUnit) - Number(b.pricePerUnit));
    if (sort === 'Fastest') return [...shops].sort((a, b) => parseInt(a.eta, 10) - parseInt(b.eta, 10));
    return shops;
  }, [shops, sort]);

  const selectedShop = sortedShops.find((s) => s.id === selectedId);
  const footerPaddingBottom = spacing.xl + insets.bottom;

  const handleSortChange = (label: SortLabel) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSort(label);
  };

  const handleSelectShop = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedId(id);
  };

  const handleProceed = () => {
    router.push('/order/upload');
  };

  if (!hasCoords) {
    return (
      <ScreenWrapper>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.85}>
            <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Nearby Print Shops</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>Set your location to see nearby shops</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/home/location-selector')} style={styles.retryBtn}>
            <Text style={styles.retryText}>Set location</Text>
          </TouchableOpacity>
        </View>
      </ScreenWrapper>
    );
  }

  if (isLoading) {
    return (
      <ScreenWrapper>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.85}>
            <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Nearby Print Shops</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loaderWrap}><Loader /></View>
      </ScreenWrapper>
    );
  }

  if (isError) {
    return (
      <ScreenWrapper>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.85}>
            <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Nearby Print Shops</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.errorWrap}>
          <Text style={styles.errorText}>{(error as Error)?.message ?? 'Failed to load shops'}</Text>
          <TouchableOpacity onPress={() => refetch()} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </ScreenWrapper>
    );
  }

  if (sortedShops.length === 0) {
    return (
      <ScreenWrapper>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.85}>
            <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Nearby Print Shops</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>No shops available in this area</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/home/location-selector')} style={styles.retryBtn}>
            <Text style={styles.retryText}>Change location</Text>
          </TouchableOpacity>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.85}>
          <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Nearby Print Shops</Text>
        <View style={styles.placeholder} />
      </View>
      <View style={styles.pills}>
        {(['Recommended', 'Lowest Price', 'Fastest'] as const).map((label) => (
          <TouchableOpacity
            key={label}
            onPress={() => handleSortChange(label)}
            activeOpacity={0.85}
          >
            <SortPill label={label} active={sort === label} />
          </TouchableOpacity>
        ))}
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: FOOTER_HEIGHT + footerPaddingBottom }]}
        showsVerticalScrollIndicator={false}
      >
        {sortedShops.map((shop) => (
          <TouchableOpacity
            key={shop.id}
            onPress={() => handleSelectShop(shop.id)}
            activeOpacity={0.92}
            style={styles.cardWrap}
          >
            <ShopCard
              shopName={shop.name}
              rating={0}
              reviewCount={0}
              pricePerUnit={shop.pricePerUnit}
              distance={shop.distance}
              eta={shop.eta}
              selected={selectedId === shop.id}
            />
          </TouchableOpacity>
        ))}
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: footerPaddingBottom }]}>
        <PrimaryButton
          label={selectedShop ? `Proceed with ${selectedShop.name.split(' ')[0]}` : 'Select a shop'}
          onPress={handleProceed}
          disabled={!selectedId}
          icon={<MaterialIcons name="arrow-forward" size={20} color={colors.textPrimary} />}
        />
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
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
  pills: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  loaderWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  errorText: { ...typography.secondary, color: colors.error, marginBottom: spacing.md, textAlign: 'center' },
  retryBtn: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  retryText: { ...typography.secondary, fontWeight: '600', color: colors.primary },
  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  emptyText: { ...typography.secondary, color: colors.textSecondary, marginBottom: spacing.md, textAlign: 'center' },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  cardWrap: { marginBottom: spacing.sm },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    backgroundColor: colors.backgroundDark,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
});
