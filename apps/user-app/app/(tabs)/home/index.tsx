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
  Linking,
  useWindowDimensions,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MaterialIcons } from '@expo/vector-icons';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Loader } from '@/components/Loader';
import { Skeleton } from '@/components/Skeleton';
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

const FOOTER_HEIGHT = 100;
const FALLBACK_LOCATION_LABEL = 'Tap to set location';
const CATEGORY_ALL = 'all';
const BANNER_AUTO_ADVANCE_MS = 3500;
const SELLERS_PAGE_LIMIT = 20;

const SERVICE_ICONS: Record<string, any> = {
  printing: 'print',
  hardware: 'construction',
  stationary: 'edit-note',
  pickup: 'local-shipping',
  grocery: 'shopping-bag',
  pharmacy: 'local-pharmacy',
  default: 'construction',
};

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
  const bannerScrollRef = useRef<ScrollView | null>(null);
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(CATEGORY_ALL);
  const [favoriteOverrides, setFavoriteOverrides] = useState<Record<string, boolean>>({});
  const bannerCardWidth = useMemo(() => Math.max(280, screenWidth - spacing.md * 2), [screenWidth]);

  // Fetch categories from API
  const { data: categoriesData, isLoading: categoriesLoading, isError: categoriesError } = useQuery({
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

  // Resolve current area name from backend location endpoint.
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

  // Normalize categories - use API data only
  const categories = useMemo(() => {
    if (categoriesData && Array.isArray(categoriesData)) {
      return categoriesData;
    }
    return [];
  }, [categoriesData]);

  // Use sellers data from API only
  const shops = useMemo(() => {
    const sellers = sellersPages?.pages.flatMap((p) => p.sellers) ?? [];
    return sellers.map((seller) => ({
      ...seller,
      isFavorited: favoriteOverrides[seller.id] ?? seller.isFavorited,
    }));
  }, [sellersPages, favoriteOverrides]);

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

  // Get last completed order from API
  const lastOrder = useMemo(() => {
    if (ordersData && Array.isArray(ordersData) && ordersData.length > 0) {
      return ordersData[0];
    }
    return null;
  }, [ordersData]);

  useEffect(() => {
    if (bannersData.length <= 1) return;
    const interval = setInterval(() => {
      setActiveBannerIndex((prev) => {
        const next = (prev + 1) % bannersData.length;
        bannerScrollRef.current?.scrollTo({ x: next * bannerCardWidth, animated: true });
        return next;
      });
    }, BANNER_AUTO_ADVANCE_MS);
    return () => clearInterval(interval);
  }, [bannersData.length, bannerCardWidth]);

  // Auto-fetch location on component mount
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
  const onBannerPress = async (banner: PromoBanner) => {
    if (!banner.ctaLink) return;
    if (banner.ctaLink.startsWith('/')) {
      router.push(banner.ctaLink as any);
      return;
    }
    await Linking.openURL(banner.ctaLink);
  };
  const onCreateOrder = () => router.push('/pickup-delivery');
  const onShopPress = (id: string) => {
    router.push({
      pathname: '/shop-detail',
      params: { shopId: id },
    });
  };
  const onToggleFavorite = (shop: NearbySeller) => {
    if (!token || !user) {
      showToast({ type: 'info', message: 'Please login to manage favorites' });
      router.replace('/(auth)/login');
      return;
    }
    if (favoriteMutation.isPending) return;
    favoriteMutation.mutate({ sellerId: shop.id, currentlyFavorited: shop.isFavorited });
  };

  const footerPaddingBottom = spacing.xl + insets.bottom;

  return (
    <ScreenWrapper>
      <View style={[styles.headerSurface, { paddingTop: spacing.md + insets.top * 0.2 }]}>
        <View style={styles.headerTopRow}>
          <View style={styles.locationRow}>
            <View style={styles.locationIconBubble}>
              <MaterialIcons name="location-on" size={20} color={colors.textLight} />
            </View>
            <TouchableOpacity
              style={styles.locationTextWrap}
              onPress={onLocationPress}
              activeOpacity={0.85}
              disabled={locationLoading}
            >
              <Text style={styles.headerLabel}>CURRENT LOCATION</Text>
              <View style={styles.locationValueRow}>
                <Text style={styles.locationText} numberOfLines={1}>
                  {locationLoading || locationAddressLoading ? 'Getting location...' : locationDisplay}
                </Text>
                <MaterialIcons name="expand-more" size={18} color={colors.textLight} />
              </View>
            </TouchableOpacity>
          </View>

          <TouchableOpacity activeOpacity={0.8} style={styles.notificationButton} onPress={onNotificationPress}>
            <MaterialIcons name="notifications-none" size={22} color={colors.textLight} />
            <View style={styles.notificationDot} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.searchShell} onPress={onSearchPress} activeOpacity={0.9}>
          <MaterialIcons name="search" size={22} color={colors.textMuted} />
          <Text style={styles.searchPlaceholder}>Search shops, items or services...</Text>
          <View style={styles.searchActionIcon}>
            <MaterialIcons name="tune" size={20} color={colors.textSecondary} />
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
          {bannersLoading ? (
            <View style={styles.promoSkeletonWrap}>
              <Skeleton height={260} borderRadius={radius['3xl']} />
            </View>
          ) : bannersData.length > 0 ? (
            <View style={styles.promoCarouselWrap}>
              <ScrollView
                ref={bannerScrollRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(event) => {
                  const offsetX = event.nativeEvent.contentOffset.x;
                  const nextIndex = Math.round(offsetX / bannerCardWidth);
                  setActiveBannerIndex(nextIndex);
                }}
              >
                {bannersData.map((banner) => (
                  <TouchableOpacity
                    key={banner.id}
                    activeOpacity={0.92}
                    onPress={() => onBannerPress(banner)}
                    style={[styles.promoCard, { width: bannerCardWidth }]}
                  >
                    <Image source={{ uri: banner.imageUrl }} style={styles.promoImage} />
                    <View style={styles.promoOverlay} />
                    <View style={styles.promoContent}>
                      {banner.badge ? (
                        <View style={styles.promoBadge}>
                          <Text style={styles.promoBadgeText}>{banner.badge}</Text>
                        </View>
                      ) : null}
                      <Text style={styles.promoTitle}>{banner.title}</Text>
                      {banner.subtitle ? (
                        <Text style={styles.promoSubtitle}>{banner.subtitle}</Text>
                      ) : null}
                      {banner.ctaText ? (
                        <View style={styles.promoCtaPill}>
                          <Text style={styles.promoCtaText}>{banner.ctaText}</Text>
                        </View>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <View style={styles.promoDots}>
                {bannersData.map((banner, index) => (
                  <View
                    key={`${banner.id}-dot`}
                    style={[styles.promoDot, index === activeBannerIndex && styles.promoDotActive]}
                  />
                ))}
              </View>
            </View>
          ) : null}

          {/* Re-book Last Service */}
          {/* Re-book Last Service - Only show if there are past orders */}
          {lastOrder && (
            <TouchableOpacity style={styles.lastServiceCard} onPress={() => router.push('/(tabs)/orders')}>
              <View style={styles.lastServiceContent}>
                <View style={styles.lastServiceIconWrap}>
                  <MaterialIcons name="history" size={24} color={colors.primary} />
                </View>
                <View style={styles.lastServiceTextWrap}>
                  <Text style={styles.lastServiceLabel}>RE-BOOK LAST SERVICE</Text>
                  <Text style={styles.lastServiceTitle} numberOfLines={1}>
                    {(lastOrder as any).order_id || 'Previous Order'}
                  </Text>
                  <Text style={styles.lastServiceShop} numberOfLines={1}>
                    {lastOrder.status || 'Completed'}
                  </Text>
                </View>
              </View>
              <MaterialIcons name="chevron-right" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          )}

          {/* Shop by Category */}
          {categoriesLoading ? (
            <View style={styles.sectionLoadingWrap}>
              <Loader />
              <Text style={styles.loadingText}>Loading categories...</Text>
            </View>
          ) : categories.length > 0 ? (
            <>
              <View style={styles.categoryHeaderRow}>
                <Text style={styles.sectionTitle}>Shop by Category</Text>
                <TouchableOpacity onPress={() => setSelectedCategoryId(CATEGORY_ALL)}>
                  <Text style={styles.viewAllText}>See All</Text>
                </TouchableOpacity>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoriesRow}
              >
                <TouchableOpacity
                  key={CATEGORY_ALL}
                  style={styles.categoryItem}
                  onPress={() => setSelectedCategoryId(CATEGORY_ALL)}
                  activeOpacity={0.85}
                >
                  <View style={[styles.categoryIconWrap, selectedCategoryId === CATEGORY_ALL && styles.categoryIconWrapActive]}>
                    <MaterialIcons
                      name="apps"
                      size={30}
                      color={selectedCategoryId === CATEGORY_ALL ? colors.primary : colors.textSecondary}
                    />
                  </View>
                  <Text style={[styles.categoryName, selectedCategoryId === CATEGORY_ALL && styles.categoryNameActive]}>
                    All
                  </Text>
                </TouchableOpacity>
                {categories.map((category: any) => (
                  <TouchableOpacity
                    key={category.id}
                    style={styles.categoryItem}
                    onPress={() => setSelectedCategoryId(category.id)}
                    activeOpacity={0.85}
                  >
                    <View
                      style={[
                        styles.categoryIconWrap,
                        selectedCategoryId === category.id && styles.categoryIconWrapActive,
                      ]}
                    >
                      {category.iconUrl ? (
                        <Image source={{ uri: category.iconUrl }} style={styles.categoryIconImage} />
                      ) : (
                        <MaterialIcons
                          name={SERVICE_ICONS[category.id] || SERVICE_ICONS.default}
                          size={30}
                          color={selectedCategoryId === category.id ? colors.primary : colors.textSecondary}
                        />
                      )}
                    </View>
                    <Text
                      style={[
                        styles.categoryName,
                        selectedCategoryId === category.id && styles.categoryNameActive,
                      ]}
                    >
                      {category.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          ) : (
            <View style={styles.emptyStateWrap}>
              <MaterialIcons name="category" size={48} color={colors.textMuted} />
              <Text style={styles.emptyStateText}>No services available</Text>
            </View>
          )}

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
            <Text style={styles.sectionTitle}>
              Nearby Shops {sellersLoading ? '' : `(${shops.length})`}
            </Text>
            <View style={styles.filterRow}>
              <MaterialIcons name="tune" size={16} color={colors.textMuted} />
              <Text style={styles.filterText}>Filter</Text>
            </View>
          </View>

          {sellersLoading && (
            <View style={styles.loadingContainer}>
              <Loader />
              <Text style={styles.loadingText}>Finding nearby shops...</Text>
            </View>
          )}

          {!sellersLoading && shops.length === 0 && locationCoords && (
            <View style={styles.noShopsContainer}>
              <MaterialIcons name="store" size={48} color={colors.textMuted} />
              <Text style={styles.noShopsText}>No shops found nearby</Text>
              <Text style={styles.noShopsSubtext}>Try expanding your search radius or change location</Text>
            </View>
          )}

          {shops.map((shop: NearbySeller) => (
            <TouchableOpacity
              key={shop.id}
              style={styles.nearbyCard}
              onPress={() => onShopPress(shop.id)}
              activeOpacity={0.8}
            >
              <Image
                source={{
                  uri:
                    shop.imageUrl ??
                    'https://images.unsplash.com/photo-1606986628025-35d57e735ae0?auto=format&fit=crop&w=400&q=80',
                }}
                style={styles.nearbyImage}
              />
              <View style={styles.nearbyRatingBadge}>
                <Text style={styles.nearbyRatingText}>{shop.rating.toFixed(1)}</Text>
                <MaterialIcons name="star" size={12} color="#f59e0b" />
              </View>
              <View style={styles.nearbyInfo}>
                <View style={styles.nearbyTopRow}>
                  <Text style={styles.nearbyName} numberOfLines={1}>
                    {shop.shopName}
                  </Text>
                  <TouchableOpacity onPress={() => onToggleFavorite(shop)} hitSlop={8}>
                    <MaterialIcons
                      name={shop.isFavorited ? 'favorite' : 'favorite-border'}
                      size={22}
                      color={shop.isFavorited ? colors.error : colors.textMuted}
                    />
                  </TouchableOpacity>
                </View>
                <Text style={styles.nearbyMeta}>
                  <MaterialIcons name="location-on" size={12} color={colors.textMuted} /> {shop.distance.toFixed(1)} km
                  {' • '}
                  {shop.address}
                </Text>
                <View style={styles.nearbyTagsRow}>
                  {(shop.categories.length ? shop.categories : [{ id: 'default', name: 'General' }])
                    .slice(0, 2)
                    .map((tag) => (
                      <View key={tag.id} style={styles.categoryTag}>
                        <Text style={styles.categoryTagText}>{tag.name}</Text>
                      </View>
                    ))}
                  <View style={[styles.openBadge, shop.isOpen ? styles.openBadgeOn : styles.openBadgeOff]}>
                    <Text style={[styles.openBadgeText, shop.isOpen ? styles.openBadgeTextOn : styles.openBadgeTextOff]}>
                      {shop.isOpen ? 'Open Now' : 'Closed'}
                    </Text>
                  </View>
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

const createStyles = (colors: any) => StyleSheet.create({
  headerSurface: {
    backgroundColor: '#0f7f79',
    borderBottomLeftRadius: radius['3xl'],
    borderBottomRightRadius: radius['3xl'],
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
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
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  locationTextWrap: {
    flex: 1,
  },
  headerLabel: {
    ...typography.meta,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 2,
    fontWeight: '600',
    letterSpacing: 0.6,
  },
  locationValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  locationText: {
    ...typography.heading3,
    color: colors.textLight,
    fontWeight: '700',
    maxWidth: 210,
  },
  notificationButton: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationDot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: radius.full,
    backgroundColor: colors.error,
    top: 14,
    right: 15,
    borderWidth: 1,
    borderColor: colors.textLight,
  },
  loaderWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: spacing.md },
  promoSkeletonWrap: {
    marginBottom: spacing.lg,
  },
  promoCarouselWrap: {
    marginBottom: spacing.lg,
  },
  promoCard: {
    height: 260,
    borderRadius: radius['3xl'],
    overflow: 'hidden',
    marginRight: spacing.md,
  },
  promoImage: {
    ...StyleSheet.absoluteFillObject,
    width: undefined,
    height: undefined,
  },
  promoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(7, 16, 35, 0.45)',
  },
  promoContent: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  promoBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#b45309',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  promoBadgeText: {
    ...typography.labelMedium,
    color: colors.textLight,
    fontWeight: '700',
  },
  promoTitle: {
    ...typography.displayMedium,
    color: colors.textLight,
    fontWeight: '700',
    lineHeight: 34,
  },
  promoSubtitle: {
    ...typography.bodyLarge,
    color: colors.textLight,
    opacity: 0.94,
  },
  promoCtaPill: {
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
    backgroundColor: colors.surfaceLight,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  promoCtaText: {
    ...typography.labelLarge,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  promoDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  promoDot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
    backgroundColor: '#9ca3af',
  },
  promoDotActive: {
    backgroundColor: colors.textLight,
    width: 10,
    height: 10,
  },
  searchShell: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderRadius: radius['2xl'],
    paddingHorizontal: spacing.md,
    minHeight: 60,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  searchPlaceholder: {
    flex: 1,
    marginLeft: spacing.sm,
    ...typography.bodyLarge,
    color: colors.textMuted,
  },
  searchActionIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
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
  categoryHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoriesRow: {
    paddingBottom: spacing.sm,
    paddingRight: spacing.md,
    marginBottom: spacing.xl,
  },
  categoryItem: {
    alignItems: 'center',
    marginRight: spacing.lg,
    width: 88,
  },
  categoryIconWrap: {
    width: 86,
    height: 86,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  categoryIconWrapActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  categoryIconImage: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    resizeMode: 'contain',
  },
  categoryName: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  categoryNameActive: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  bannerContainer: {
    flexDirection: 'row',
    backgroundColor: 'colors.primary',
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
    color: 'colors.textLight',
    marginBottom: spacing.xs - 2,
  },
  bannerSubtitle: {
    ...typography.secondary,
    fontWeight: '700',
    color: 'colors.textLight',
    marginBottom: spacing.md,
  },
  claimButton: {
    alignSelf: 'flex-start',
    backgroundColor: 'colors.textLight',
    paddingVertical: spacing.sm - 2,
    paddingHorizontal: spacing.md,
    borderRadius: 6,
  },
  claimButtonText: {
    ...typography.meta,
    fontWeight: '700',
    color: 'colors.primary',
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
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  filterText: {
    ...typography.bodyMedium,
    color: colors.textMuted,
  },
  viewAllText: {
    ...typography.meta,
    fontWeight: '700',
    color: colors.primary,
  },
  nearbyCard: {
    backgroundColor: colors.surfaceDark,
    borderRadius: radius['2xl'],
    padding: spacing.md,
    flexDirection: 'row',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderDark,
    gap: spacing.md,
  },
  nearbyImage: {
    width: 104,
    height: 104,
    borderRadius: radius.xl,
    backgroundColor: colors.surfaceDark,
  },
  nearbyRatingBadge: {
    position: 'absolute',
    top: spacing.md - 4,
    left: spacing.md + 72,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.94)',
    paddingVertical: spacing.xs - 2,
    paddingHorizontal: spacing.sm,
    borderRadius: 6,
    gap: spacing.xxs,
  },
  nearbyRatingText: {
    ...typography.meta,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  nearbyInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  nearbyTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  nearbyName: {
    ...typography.secondary,
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
  },
  nearbyMeta: {
    ...typography.meta,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  nearbyTagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  categoryTag: {
    paddingVertical: spacing.xs - 1,
    paddingHorizontal: spacing.md,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.surfaceMuted,
  },
  categoryTagText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  openBadge: {
    marginLeft: 'auto',
    paddingVertical: spacing.xs - 1,
    paddingHorizontal: spacing.md,
    borderRadius: radius.xl,
  },
  openBadgeOn: {
    backgroundColor: 'rgba(16, 185, 129, 0.14)',
  },
  openBadgeOff: {
    backgroundColor: 'rgba(239, 68, 68, 0.14)',
  },
  openBadgeText: {
    ...typography.bodySmall,
    fontWeight: '700',
  },
  openBadgeTextOn: {
    color: colors.success,
  },
  openBadgeTextOff: {
    color: colors.error,
  },
  paginationLoader: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  loadingContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.md,
  },
  loadingText: {
    ...typography.secondary,
    color: colors.textMuted,
    fontWeight: '500',
  },
  noShopsContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  noShopsText: {
    ...typography.secondary,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  noShopsSubtext: {
    ...typography.meta,
    color: colors.textMuted,
    textAlign: 'center',
  },
  sectionLoadingWrap: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.md,
  },
  emptyStateWrap: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  emptyStateText: {
    ...typography.secondary,
    fontWeight: '600',
    color: colors.textPrimary,
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
