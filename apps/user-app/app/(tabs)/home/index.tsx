/**
 * Home / Services screen – categories from API with fallback dummy data.
 */
import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image } from 'react-native';
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
import { ordersApi } from '@/api/orders.api';
import { useLocationStore } from '@/store/location.store';

const FOOTER_HEIGHT = 100;
const FALLBACK_LOCATION_LABEL = 'Tap to set location';
const CATEGORY_PRINTING = 'printing';

// Dummy/Fallback data
const DUMMY_QUICK_SERVICES = [
  { id: 'printing', icon: 'print', label: 'Printing', description: 'Documents & Photos' },
  { id: 'pickup', icon: 'local-shipping', label: 'Pick & Drop', description: 'Instant delivery' },
  { id: 'grocery', icon: 'shopping-bag', label: 'Grocery', description: 'Fresh produce' },
  { id: 'pharmacy', icon: 'local-pharmacy', label: 'Pharmacy', description: 'Health essentials' },
];

const DUMMY_LAST_SERVICE = {
  title: 'Printing: Business Cards',
  shop: 'Pixel Perfect Prints',
  price: '₹250',
  image: 'https://images.unsplash.com/photo-1606986628025-35d57e735ae0?auto=format&fit=crop&w=200&q=80',
};

const DUMMY_SHOPS = [
  {
    id: 'shop-1',
    name: 'Green Leaf Market',
    distance: '0.8 km',
    category: 'Grocery & Fresh Produce',
    rating: 4.8,
    image: 'https://images.unsplash.com/photo-1585521537990-7b0a47ebc519?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'shop-2',
    name: 'Pixel Perfect Prints',
    distance: '1.2 km',
    category: 'Business & Photo Printing',
    rating: 4.9,
    image: 'https://images.unsplash.com/photo-1599720863485-11d234ce1f3e?auto=format&fit=crop&w=400&q=80',
  },
];

const SERVICE_ICONS: Record<string, any> = {
  printing: 'print',
  stationery: 'edit-note',
  pickup: 'local-shipping',
  grocery: 'shopping-bag',
  pharmacy: 'local-pharmacy',
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
  
  const [search, setSearch] = useState('');

  // Fetch categories from API
  const { data: categoriesData, isLoading: categoriesLoading, isError: categoriesError } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.getCategories(),
  });

  // Fetch sellers nearby
  const { data: sellersData = [] } = useQuery({
    queryKey: ['sellers', CATEGORY_PRINTING, locationCoords?.latitude, locationCoords?.longitude],
    queryFn: () =>
      sellersApi.getAvailableSellers({
        category: CATEGORY_PRINTING,
        lat: locationCoords?.latitude,
        lng: locationCoords?.longitude,
      }),
    enabled: Boolean(locationCoords?.latitude != null && locationCoords?.longitude != null),
  });

  // Fetch last service/order
  const { data: ordersData } = useQuery({
    queryKey: ['orders'],
    queryFn: () => ordersApi.getMyOrders?.(),
  });

  // Normalize categories - use API data if available, fallback to dummy
  const categories = useMemo(() => {
    if (categoriesError || !categoriesData || !Array.isArray(categoriesData)) {
      // Fallback to dummy quick services
      return DUMMY_QUICK_SERVICES.map(item => ({
        id: item.id,
        name: item.label,
        status: 'ACTIVE',
      }));
    }
    return categoriesData;
  }, [categoriesData, categoriesError]);

  // Use sellers data or fallback to dummy
  const shops = useMemo(() => {
    if (!sellersData || sellersData.length === 0) {
      return DUMMY_SHOPS;
    }
    // Map API sellers to shop format
    return sellersData.map((seller: any) => ({
      id: seller.seller_id,
      name: seller.shop_name || 'Unknown Shop',
      distance: `${(seller.distance_km || 0).toFixed(1)} km`,
      category: seller.address || 'Services',
      rating: 4.8,
      image: `https://images.unsplash.com/photo-1606986628025-35d57e735ae0?auto=format&fit=crop&w=400&q=80`,
    }));
  }, [sellersData]);

  const onLocationPress = () => router.push('/(tabs)/home/location-selector');
  const onServicePress = () => {
    // Navigate to shop detail when selecting a service
    router.push({
      pathname: '/shop-detail',
      params: { shopId: 'shop-1' }, // Could be dynamic based on service selected
    });
  };
  const onCreateOrder = () => router.push('/pickup-delivery');
  const onShopPress = (id: string) => {
    router.push({
      pathname: '/shop-detail',
      params: { shopId: id },
    });
  };

  const footerPaddingBottom = spacing.xl + insets.bottom;

  return (
    <ScreenWrapper>
      {/* Header with Location */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerLabel}>DELIVERING TO</Text>
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
        <TouchableOpacity activeOpacity={0.7} style={styles.profileButton}>
          <View style={styles.profileAvatar}>
            <MaterialIcons name="person" size={24} color={colors.primary} />
          </View>
        </TouchableOpacity>
      </View>

      {categoriesLoading ? (
        <View style={styles.loaderWrap}>
          <Loader />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: FOOTER_HEIGHT + footerPaddingBottom }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <MaterialIcons name="search" size={20} color={colors.textMuted} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search for shops or services"
              placeholderTextColor={colors.textMuted}
              value={search}
              onChangeText={setSearch}
            />
          </View>

          {/* Re-book Last Service */}
          <TouchableOpacity style={styles.lastServiceCard} onPress={onServicePress}>
            <View style={styles.lastServiceContent}>
              <View style={styles.lastServiceIconWrap}>
                <MaterialIcons name="history" size={24} color={colors.primary} />
              </View>
              <View style={styles.lastServiceTextWrap}>
                <Text style={styles.lastServiceLabel}>RE-BOOK LAST SERVICE</Text>
                <Text style={styles.lastServiceTitle}>{DUMMY_LAST_SERVICE.title}</Text>
                <Text style={styles.lastServiceShop} numberOfLines={1}>
                  {DUMMY_LAST_SERVICE.shop} • {DUMMY_LAST_SERVICE.price}
                </Text>
              </View>
            </View>
            <MaterialIcons name="chevron-right" size={20} color={colors.textMuted} />
          </TouchableOpacity>

          {/* Quick Service Access */}
          <Text style={styles.sectionTitle}>Quick Service Access</Text>
          <View style={styles.quickServicesGrid}>
            {categories.map((category: any) => (
              <TouchableOpacity
                key={category.id}
                style={styles.quickServiceCard}
                onPress={onServicePress}
                activeOpacity={0.7}
              >
                <View style={styles.quickServiceIconWrap}>
                  <MaterialIcons name={SERVICE_ICONS[category.id] || SERVICE_ICONS.default} size={32} color={colors.primary} />
                </View>
                <Text style={styles.quickServiceLabel}>{category.name}</Text>
                <Text style={styles.quickServiceDesc}>
                  {category.id === 'printing' ? 'Documents & Photos' : 'Fresh service'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Free Delivery Banner */}
          <View style={styles.bannerContainer}>
            <View style={styles.bannerContent}>
              <Text style={styles.bannerTitle}>Free delivery</Text>
              <Text style={styles.bannerSubtitle}>on your first order</Text>
              <TouchableOpacity style={styles.claimButton}>
                <Text style={styles.claimButtonText}>CLAIM NOW</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.bannerDecor}>
              <MaterialIcons name="local-shipping" size={80} color={colors.primary} opacity={0.1} />
            </View>
          </View>

          {/* Nearby Shops Section */}
          <View style={styles.nearbyHeader}>
            <Text style={styles.sectionTitle}>Nearby Shops</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/home/sellers')}>
              <Text style={styles.viewAllText}>VIEW ALL</Text>
            </TouchableOpacity>
          </View>

          {shops.map((shop: any) => (
            <TouchableOpacity
              key={shop.id}
              style={styles.shopCard}
              onPress={() => onShopPress(shop.id)}
              activeOpacity={0.8}
            >
              <Image source={{ uri: shop.image }} style={styles.shopImage} />
              <View style={styles.ratingBadge}>
                <MaterialIcons name="star" size={14} color="#FFD700" />
                <Text style={styles.ratingText}>{shop.rating}</Text>
              </View>
              <View style={styles.shopInfo}>
                <Text style={styles.shopName}>{shop.name}</Text>
                <Text style={styles.shopMeta}>
                  <MaterialIcons name="location-on" size={12} color={colors.textMuted} /> {shop.distance} • {shop.category}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Footer Button */}
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
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDark,
  },
  headerLabel: {
    ...typography.meta,
    color: colors.textMuted,
    marginBottom: spacing.xs - 2,
    fontWeight: '500',
  },
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs - 2,
    backgroundColor: 'transparent',
    paddingVertical: spacing.xs - 2,
    paddingHorizontal: 0,
  },
  locationText: {
    ...typography.secondary,
    fontWeight: '600',
    color: colors.textPrimary,
    maxWidth: 180,
  },
  profileButton: {
    marginTop: spacing.sm,
  },
  profileAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryTint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: spacing.md },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceDark,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
    marginVertical: spacing.md,
    height: 48,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...typography.secondary,
    color: colors.textPrimary,
  },
  lastServiceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceDark,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderDark,
  },
  lastServiceContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  lastServiceIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 10,
    backgroundColor: colors.primaryTint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lastServiceTextWrap: {
    flex: 1,
  },
  lastServiceLabel: {
    ...typography.meta,
    color: colors.textMuted,
    marginBottom: spacing.xxs,
    fontWeight: '600',
  },
  lastServiceTitle: {
    ...typography.secondary,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xxs,
  },
  lastServiceShop: {
    ...typography.meta,
    color: colors.textSecondary,
  },
  sectionTitle: {
    ...typography.sectionHeader,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
    marginTop: spacing.lg,
  },
  quickServicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  quickServiceCard: {
    width: '48%',
    backgroundColor: colors.surfaceDark,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderDark,
  },
  quickServiceIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: colors.primaryTint,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  quickServiceLabel: {
    ...typography.secondary,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xxs,
  },
  quickServiceDesc: {
    ...typography.meta,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  bannerContainer: {
    flexDirection: 'row',
    backgroundColor: '#6366F1',
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    overflow: 'hidden',
  },
  bannerContent: {
    flex: 1,
    justifyContent: 'center',
  },
  bannerTitle: {
    ...typography.sectionHeader,
    color: '#FFF',
    marginBottom: spacing.xs - 2,
  },
  bannerSubtitle: {
    ...typography.secondary,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: spacing.md,
  },
  claimButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF',
    paddingVertical: spacing.sm - 2,
    paddingHorizontal: spacing.md,
    borderRadius: 6,
  },
  claimButtonText: {
    ...typography.meta,
    fontWeight: '700',
    color: '#6366F1',
  },
  bannerDecor: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    width: 100,
  },
  nearbyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  viewAllText: {
    ...typography.meta,
    fontWeight: '700',
    color: colors.primary,
  },
  shopCard: {
    backgroundColor: colors.surfaceDark,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderDark,
  },
  shopImage: {
    width: '100%',
    height: 160,
    backgroundColor: colors.surfaceDark,
  },
  ratingBadge: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingVertical: spacing.xs - 2,
    paddingHorizontal: spacing.sm,
    borderRadius: 6,
    gap: spacing.xxs,
  },
  ratingText: {
    ...typography.meta,
    color: '#FFF',
    fontWeight: '600',
  },
  shopInfo: {
    padding: spacing.md,
  },
  shopName: {
    ...typography.secondary,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs - 2,
  },
  shopMeta: {
    ...typography.meta,
    color: colors.textSecondary,
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
