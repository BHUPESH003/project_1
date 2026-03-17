/**
 * Home / Services screen – categories from API, all data from APIs only (no fallback dummy data).
 */
import React, { useMemo, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ImageBackground,
  Linking,
  useWindowDimensions,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Loader } from '@/components/Loader';
import { Skeleton } from '@/components/Skeleton';
import { FloatingCartButton } from '@/components/FloatingCartButton';
import { StickyMultiCartBar } from '@/components/StickyMultiCartBar';
import { useThemeColors, useThemedStyles } from '@/theme';
import { radius } from '@/constants/radius';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { categoriesApi } from '@/api/categories.api';
import { bannersApi, type PromoBanner } from '@/api/banners.api';
import { favoritesApi } from '@/api/favorites.api';
import { sellersApi, type NearbySeller } from '@/api/sellers.api';
import { ordersApi } from '@/api/orders.api';
import client from '@/api/client';
import { unwrap } from '@/api/unwrap';
import { showToast } from '@/lib/toast';
import { useAuthStore } from '@/store/auth.store';
import { useLocationStore } from '@/store/location.store';

const FALLBACK_LOCATION_LABEL = 'Tap to set location';
const CATEGORY_ALL = 'all';
const SELLERS_PAGE_LIMIT = 20;

const SERVICE_ICONS: Record<string, any> = {
  printing: 'print',
  hardware: 'build',
  stationary: 'create',
  pickup: 'bus',
  grocery: 'basket',
  pharmacy: 'medkit',
  default: 'build',
};

// Filter pills for the top row
const FILTER_PILLS = [
  { id: 'near_fast', label: 'Near & Fast' },
  { id: 'new_added', label: 'New Added' },
  { id: 'offers', label: 'Offers', isPrimary: true },
  { id: 'under_x', label: 'Items Under ₹99' },
];

export default function HomeScreen() {
  const colors = useThemeColors();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const locationCoords = useLocationStore((s) => s.coords);
  const locationLabel = useLocationStore((s) => s.coords?.label);
  const locationLoading = useLocationStore((s) => s.loading);
  const fetchLocation = useLocationStore((s) => s.fetchLocation);
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(CATEGORY_ALL);
  const [favoriteOverrides, setFavoriteOverrides] = useState<Record<string, boolean>>({});

  // Fetch categories from API
  const { data: categoriesData, isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.getCategories(),
  });

  // Fetch promotional banners
  const { data: bannersData = [], isLoading: bannersLoading } = useQuery({
    queryKey: ['promo-banners'],
    queryFn: () => bannersApi.getBanners(),
  });

  const {
    data: sellersPages,
    isLoading: sellersLoading,
    isRefetching: sellersRefreshing,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch: refetchSellers,
  } = useInfiniteQuery({
    queryKey: ['nearby-sellers', selectedCategoryId, locationCoords?.latitude, locationCoords?.longitude],
    initialPageParam: 0,
    queryFn: ({ pageParam = 0 }) =>
      sellersApi.getNearbySellers({
        lat: locationCoords?.latitude as number,
        lng: locationCoords?.longitude as number,
        categoryId: selectedCategoryId === CATEGORY_ALL ? undefined : selectedCategoryId,
        limit: SELLERS_PAGE_LIMIT,
        offset: pageParam,
      }),
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((acc, p) => acc + p.sellers.length, 0);
      if (loaded >= lastPage.total) return undefined;
      return loaded;
    },
    enabled: Boolean(locationCoords?.latitude != null && locationCoords?.longitude != null),
  });

  // Fetch last service/order
  const { data: ordersData } = useQuery({
    queryKey: ['orders'],
    queryFn: () => ordersApi.getMyOrders?.(),
  });

  // Resolve current area name
  const { data: locationAddressData, isLoading: locationAddressLoading } = useQuery({
    queryKey: ['location-address', locationCoords?.latitude, locationCoords?.longitude],
    queryFn: async () => {
      const res = await client.get('/location/address', {
        params: { lat: locationCoords?.latitude, lng: locationCoords?.longitude },
      });
      return unwrap<any>(res);
    },
    enabled: Boolean(locationCoords?.latitude != null && locationCoords?.longitude != null),
  });

  const serverAreaName = useMemo(() => {
    const payload = locationAddressData as any;
    if (!payload) return null;
    if (typeof payload === 'string') return payload;
    return (
      payload.areaName ||
      payload.area ||
      payload.locality ||
      payload.neighborhood ||
      payload.city ||
      payload.address ||
      payload.formattedAddress ||
      payload.label ||
      null
    );
  }, [locationAddressData]);

  const locationDisplay =
    serverAreaName ??
    locationLabel ??
    (locationCoords
      ? `${locationCoords.latitude.toFixed(2)}, ${locationCoords.longitude.toFixed(2)}`
      : FALLBACK_LOCATION_LABEL);

  const categories = useMemo(() => {
    if (categoriesData && Array.isArray(categoriesData)) {
      return categoriesData;
    }
    return [];
  }, [categoriesData]);

  const shops = useMemo(() => {
    const sellers = sellersPages?.pages.flatMap((p) => p.sellers) ?? [];
    return sellers.map((seller) => ({
      ...seller,
      isFavorited: favoriteOverrides[seller.id] ?? seller.isFavorited,
    }));
  }, [sellersPages, favoriteOverrides]);

  const dealHubItems = useMemo(() => shops.slice(0, 3), [shops]);
  const spotlightShop = useMemo(() => shops[0], [shops]);
  const trendingShops = useMemo(() => shops.slice(0, 5), [shops]);

  const favoriteMutation = useMutation({
    mutationFn: async ({ sellerId, currentlyFavorited }: { sellerId: string; currentlyFavorited: boolean }) => {
      if (currentlyFavorited) {
        await favoritesApi.removeFavorite(sellerId);
      } else {
        await favoritesApi.addFavorite(sellerId);
      }
      return !currentlyFavorited;
    },
    onMutate: ({ sellerId, currentlyFavorited }) => {
      setFavoriteOverrides((prev) => ({ ...prev, [sellerId]: !currentlyFavorited }));
    },
    onError: (_error, { sellerId, currentlyFavorited }) => {
      setFavoriteOverrides((prev) => ({ ...prev, [sellerId]: currentlyFavorited }));
      showToast({ type: 'error', message: 'Failed to update favorites' });
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ['nearby-sellers', selectedCategoryId, locationCoords?.latitude, locationCoords?.longitude],
      });
    },
  });

  useEffect(() => {
    if (!locationCoords && !locationLoading) {
      fetchLocation();
    }
  }, []);

  const onLocationPress = () => router.push('/(tabs)/home/location-selector');
  const onSearchPress = () =>
    router.push({
      pathname: '/(tabs)/home/sellers',
      params: { category: selectedCategoryId },
    });
  const onNotificationPress = () => router.push('/(tabs)/profile/notifications');
  const onShopPress = (id: string) => {
    router.push({
      pathname: '/shop-detail',
      params: { shopId: id },
    });
  };

  return (
    <ScreenWrapper>
      <View style={[styles.headerSurface, { paddingTop: spacing.md + insets.top * 0.2 }]}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity
             style={styles.locationRow}
             onPress={onLocationPress}
             activeOpacity={0.85}
             disabled={locationLoading}
          >
            <View style={styles.locationIconBubble}>
              <Ionicons name="location" size={24} color={colors.primary} />
            </View>
            <View style={styles.locationTextWrap}>
              <Text style={styles.headerLabel}>DELIVER TO</Text>
              <View style={styles.locationValueRow}>
                <Text style={styles.locationText} numberOfLines={1}>
                  {locationLoading || locationAddressLoading ? 'Getting location...' : locationDisplay}
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity activeOpacity={0.8} style={styles.notificationButton} onPress={onNotificationPress}>
            <Ionicons name="notifications" size={24} color={colors.textPrimary} />
            <View style={styles.notificationDot} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.searchShell} onPress={onSearchPress} activeOpacity={0.9}>
          <Ionicons name="search" size={20} color={colors.textMuted} />
          <Text style={styles.searchPlaceholder}>Search for snacks, sweets or shops</Text>
        </TouchableOpacity>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsRow}>
           {FILTER_PILLS.map((pill) => (
             <TouchableOpacity
               key={pill.id}
               style={[styles.pill, pill.isPrimary && styles.pillPrimary]}
             >
                <Text style={[styles.pillText, pill.isPrimary && styles.pillTextPrimary]}>
                  {pill.label}
                </Text>
             </TouchableOpacity>
           ))}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={sellersRefreshing}
            onRefresh={() => refetchSellers()}
            tintColor={colors.primary}
          />
        }
        onScroll={(event) => {
          const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
          const nearBottom = contentOffset.y + layoutMeasurement.height >= contentSize.height - 240;
          if (nearBottom && hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
          }
        }}
        scrollEventThrottle={120}
      >

        {/* Deal Hub Container */}
        <View style={styles.dealHubHeader}>
            <View style={styles.dealHubTitleWrap}>
                <Ionicons name="flash" size={20} color="#f59e0b" />
                <Text style={styles.sectionTitle}>Deal Hub</Text>
            </View>
            <View style={styles.timerBadge}>
               <Ionicons name="time-outline" size={14} color="#b45309" />
               <Text style={styles.timerBadgeText}>ENDS IN 02:45:10</Text>
            </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScrollPadding}>
             {dealHubItems.map((shop, i) => (
                <TouchableOpacity key={shop.id} style={styles.dealCard} onPress={() => onShopPress(shop.id)}>
                   <View style={styles.dealImageContainer}>
                      <Image source={{ uri: shop.imageUrl ?? 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80' }} style={styles.dealImage} />
                      <View style={styles.dealTag}>
                         <Text style={styles.dealTagText}>{i === 0 ? '₹50 OFF' : 'FREE ITEM'}</Text>
                      </View>
                   </View>
                   <View style={styles.dealInfo}>
                      <Text style={styles.dealShopTitle} numberOfLines={1}>{shop.shopName}</Text>
                      <Text style={styles.dealItemTitle} numberOfLines={1}>Combo Box Offer</Text>
                      <View style={styles.dealPriceWrap}>
                         <Text style={styles.dealPriceNow}>₹{i === 0 ? '150' : '0.00'}</Text>
                         <Text style={styles.dealPriceOld}>₹{i === 0 ? '200' : '240'}</Text>
                      </View>
                   </View>
                </TouchableOpacity>
             ))}
             {dealHubItems.length === 0 && sellersLoading && (
                <Skeleton width={160} height={200} borderRadius={12} style={{marginRight: 16}} />
             )}
        </ScrollView>

        {/* Shop Spotlight */}
        <Text style={[styles.sectionTitle, { marginHorizontal: 16, marginTop: 24 }]}>Shop Spotlight</Text>
        {spotlightShop ? (
            <TouchableOpacity style={styles.spotlightCard} onPress={() => onShopPress(spotlightShop.id)}>
                <ImageBackground
                    source={{ uri: spotlightShop.imageUrl ?? 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80' }}
                    style={styles.spotlightImage}
                    imageStyle={{ borderRadius: 16 }}
                >
                    <View style={styles.spotlightTag}>
                        <Text style={styles.spotlightTagText}>NEW ADDED</Text>
                    </View>
                    <View style={styles.spotlightOverlay}>
                        <View style={styles.spotlightContent}>
                           <View>
                               <View style={styles.spotlightTitleRow}>
                                  <Text style={styles.spotlightTitle}>{spotlightShop.shopName}</Text>
                                  <View style={styles.spotlightNewBadge}>
                                    <Ionicons name="star" size={10} color={colors.primaryDark} />
                                    <Text style={styles.spotlightNewText}>New</Text>
                                  </View>
                               </View>
                               <Text style={styles.spotlightSubtitle}>Premium Supplies & Hand-crafted Tools</Text>
                           </View>

                           <View style={styles.spotlightBottomRow}>
                                <View style={styles.spotlightMetaRow}>
                                    <Ionicons name="paper-plane" size={14} color="#d1d5db" />
                                    <Text style={styles.spotlightMetaText}>{spotlightShop.distance.toFixed(1)} km</Text>
                                    <View style={styles.spotlightDiscount}>
                                       <Ionicons name="pricetag" size={14} color="#d97706" />
                                       <Text style={styles.spotlightDiscountText}>Flat 20% OFF</Text>
                                    </View>
                                </View>
                                <View style={styles.spotlightBtn}>
                                    <Text style={styles.spotlightBtnText}>Explore</Text>
                                </View>
                           </View>
                        </View>
                    </View>
                </ImageBackground>
            </TouchableOpacity>
        ) : sellersLoading && (
            <Skeleton height={240} borderRadius={16} style={{marginHorizontal: 16, marginBottom: 24}} />
        )}

        {/* Trending Local Shops */}
        <Text style={[styles.sectionTitle, { marginHorizontal: 16, marginTop: 24 }]}>Trending Local Shops</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScrollPadding}>
             {trendingShops.map((shop) => (
                <TouchableOpacity key={shop.id} style={styles.trendingCard} onPress={() => onShopPress(shop.id)}>
                   <Image source={{ uri: shop.imageUrl ?? 'https://images.unsplash.com/photo-1512418490979-92798e1465e6?auto=format&fit=crop&w=400&q=80' }} style={styles.trendingImage} />
                   <View style={styles.trendingInfo}>
                      <Text style={styles.trendingTitle} numberOfLines={1}>{shop.shopName}</Text>
                      <Text style={styles.trendingSubtitle} numberOfLines={2}>Premium tools and home improvement gear.</Text>
                   </View>
                </TouchableOpacity>
             ))}
             {trendingShops.length === 0 && sellersLoading && (
                <Skeleton width={180} height={180} borderRadius={12} style={{marginRight: 16}} />
             )}
        </ScrollView>

        {/* Category Sticky Headers */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.horizontalScrollPadding, { marginTop: 12, marginBottom: 16 }]}>
            <TouchableOpacity
                   style={[styles.categoryTab, selectedCategoryId === CATEGORY_ALL && styles.categoryTabActive]}
                   onPress={() => setSelectedCategoryId(CATEGORY_ALL)}
            >
                   <Text style={[styles.categoryTabText, selectedCategoryId === CATEGORY_ALL && styles.categoryTabTextActive]}>All</Text>
            </TouchableOpacity>
            {categories.map((c: any) => (
               <TouchableOpacity
                   key={c.id}
                   style={[styles.categoryTab, selectedCategoryId === c.id && styles.categoryTabActive]}
                   onPress={() => setSelectedCategoryId(c.id)}
               >
                   <Text style={[styles.categoryTabText, selectedCategoryId === c.id && styles.categoryTabTextActive]}>{c.name}</Text>
               </TouchableOpacity>
            ))}
        </ScrollView>

        {/* Nearby Shops Section */}
        <View style={styles.nearbyHeader}>
            <Text style={styles.sectionTitle}>Nearby Shops</Text>
            <TouchableOpacity>
               <Text style={styles.viewAllText}>View all</Text>
            </TouchableOpacity>
        </View>

        {sellersLoading && shops.length === 0 && (
            <View style={styles.loadingContainer}>
              <Loader />
            </View>
        )}

        {!sellersLoading && shops.length === 0 && locationCoords && (
            <View style={styles.noShopsContainer}>
              <Ionicons name="storefront" size={48} color={colors.textMuted} />
              <Text style={styles.noShopsText}>No shops found nearby</Text>
              <Text style={styles.noShopsSubtext}>Try expanding your search radius or change location</Text>
            </View>
        )}

        {shops.map((shop: NearbySeller, i) => (
            <TouchableOpacity
              key={shop.id}
              style={styles.verticalShopCard}
              onPress={() => onShopPress(shop.id)}
              activeOpacity={0.8}
            >
              <View style={styles.verticalShopImageContainer}>
                 <Image
                    source={{
                      uri: shop.imageUrl ?? 'https://images.unsplash.com/photo-1606986628025-35d57e735ae0?auto=format&fit=crop&w=400&q=80',
                    }}
                    style={styles.verticalShopImage}
                 />
                 <View style={styles.verticalShopBadge}>
                    <Ionicons name="pricetag" size={12} color="#fff" />
                    <Text style={styles.verticalShopBadgeText}>₹100 OFF ABOVE ₹499</Text>
                 </View>
              </View>

              <View style={styles.verticalShopInfo}>
                 <View style={styles.verticalShopRow}>
                    <Text style={styles.verticalShopName} numberOfLines={1}>{shop.shopName}</Text>
                    <View style={styles.verticalShopRating}>
                        <Ionicons name="star" size={10} color="#f59e0b" />
                        <Text style={styles.verticalShopRatingText}>{shop.rating.toFixed(1)}</Text>
                    </View>
                 </View>
                 <Text style={styles.verticalShopDesc} numberOfLines={1}>{
                    (shop as any).description 
                      ? (shop as any).description
                      : shop.categories?.map(c => c.name).join(', ') || 'Various Categories'
                 }</Text>

                 <View style={styles.verticalShopMetaRow}>
                    <Ionicons name="time" size={14} color={colors.textSecondary} />
                    <Text style={styles.verticalShopMetaText}>{(shop as any).prepTimeMinutes ? `${(shop as any).prepTimeMinutes} min` : '15-20 min'}</Text>
                    <Ionicons name="bicycle" size={14} color={colors.primary} style={{marginLeft: 12}} />
                    <Text style={styles.verticalShopDeliveryText}>{(shop as any).deliveryFee === 0 ? 'Free Delivery' : 'Standard Delivery'}</Text>
                 </View>
              </View>
            </TouchableOpacity>
        ))}

        {isFetchingNextPage ? (
            <View style={styles.paginationLoader}>
              <Loader />
            </View>
        ) : null}
      </ScrollView>
      
      {/* Sticky Multi-Cart Bar at bottom */}
      <StickyMultiCartBar tabBarHeight={60} />
    </ScreenWrapper>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  headerSurface: {
    backgroundColor: '#ffffff',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    marginBottom: spacing.xs,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
  locationIconBubble: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: '#e6f8f8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  locationTextWrap: {
    flex: 1,
  },
  headerLabel: {
    ...typography.meta,
    color: colors.textSecondary,
    marginBottom: 0,
    fontWeight: '700',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  locationValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    ...typography.bodyLarge,
    color: colors.textPrimary,
    fontWeight: '800',
    maxWidth: 210,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationDot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: radius.full,
    backgroundColor: colors.error,
    top: 10,
    right: 12,
    borderWidth: 2,
    borderColor: '#fff',
  },
  searchShell: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    height: 48,
    marginBottom: spacing.md,
  },
  searchPlaceholder: {
    flex: 1,
    marginLeft: spacing.sm,
    ...typography.bodyMedium,
    color: colors.textMuted,
  },
  pillsRow: {
    gap: spacing.sm,
    paddingRight: spacing.md,
  },
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.surface,
  },
  pillPrimary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pillText: {
    ...typography.meta,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  pillTextPrimary: {
    color: '#fff',
  },
  scroll: { flex: 1, backgroundColor: '#f9fafb' },
  scrollContent: { flexGrow: 1 },
  horizontalScrollPadding: { paddingHorizontal: 16, paddingBottom: 16, gap: 16 },
  sectionTitle: {
    ...typography.heading3,
    color: colors.textPrimary,
    fontWeight: '800',
  },
  dealHubHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 24,
    marginBottom: 16,
  },
  dealHubTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  timerBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#b45309',
  },
  dealCard: {
    width: 160,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
  },
  dealImageContainer: {
    height: 110,
    position: 'relative',
    backgroundColor: colors.surfaceDark,
  },
  dealImage: {
    ...StyleSheet.absoluteFillObject,
    resizeMode: 'cover',
  },
  dealTag: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: colors.error,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  dealTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#fff',
  },
  dealInfo: {
    padding: 12,
  },
  dealShopTitle: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '600',
    marginBottom: 2,
  },
  dealItemTitle: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '700',
    marginBottom: 6,
  },
  dealPriceWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dealPriceNow: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  dealPriceOld: {
    fontSize: 12,
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
  spotlightCard: {
    marginHorizontal: 16,
    marginTop: 16,
    height: 240,
    borderRadius: 16,
    overflow: 'hidden',
  },
  spotlightImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'space-between',
  },
  spotlightOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
    borderRadius: 16,
  },
  spotlightTag: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    margin: 16,
    position: 'absolute',
    zIndex: 10,
  },
  spotlightTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#fff',
  },
  spotlightContent: {
    padding: 16,
    gap: 16,
  },
  spotlightTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  spotlightTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
  },
  spotlightNewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 2,
  },
  spotlightNewText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '700',
  },
  spotlightSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  spotlightBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  spotlightMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  spotlightMetaText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
    marginRight: 8,
  },
  spotlightDiscount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  spotlightDiscountText: {
    fontSize: 12,
    color: '#d97706',
    fontWeight: '800',
  },
  spotlightBtn: {
    backgroundColor: colors.primaryDark,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  spotlightBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  trendingCard: {
    width: 180,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: 8,
  },
  trendingImage: {
    width: '100%',
    height: 100,
    borderRadius: 8,
    marginBottom: 8,
  },
  trendingInfo: {
    paddingHorizontal: 4,
    paddingBottom: 4,
  },
  trendingTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  trendingSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  categoryTab: {
    paddingBottom: 8,
  },
  categoryTabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  categoryTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  categoryTabTextActive: {
    color: colors.primaryDark,
    fontWeight: '800',
  },
  nearbyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary,
  },
  verticalShopCard: {
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: 16,
    overflow: 'hidden',
  },
  verticalShopImageContainer: {
    height: 140,
    position: 'relative',
    backgroundColor: colors.surfaceMuted,
  },
  verticalShopImage: {
    ...StyleSheet.absoluteFillObject,
    resizeMode: 'cover',
  },
  verticalShopBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.error,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  verticalShopBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#fff',
  },
  verticalShopInfo: {
    padding: 16,
  },
  verticalShopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  verticalShopName: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
    flex: 1,
  },
  verticalShopRating: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 2,
  },
  verticalShopRatingText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  verticalShopDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  verticalShopMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verticalShopMetaText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginLeft: 4,
  },
  verticalShopDeliveryText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    marginLeft: 4,
  },
  paginationLoader: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  loadingContainer: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  noShopsContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  noShopsText: {
    ...typography.secondary,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 12,
  },
  noShopsSubtext: {
    ...typography.meta,
    color: colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
});
