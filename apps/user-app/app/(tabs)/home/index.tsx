/**
 * Refined Home Screen - Stitch Design Implementation
 *
 * Features:
 * - Personalized greeting with user name and location
 * - Search bar with shop/item search
 * - Hero banner with promotional content
 * - Category filter pills (All, then API categories)
 * - Featured shops carousel (Flash Sale)
 * - Community Favorites section (featured products)
 * - Shop spotlight card
 * - Nearby shops list
 * - Infinite scroll with pagination
 * - Floating cart button
 * - Theme-aware styling using core tokens
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
  useWindowDimensions,
  RefreshControl,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Loader } from '@/components/Loader';
import { Skeleton } from '@/components/Skeleton';
import { useThemeColors, useThemedStyles } from '@/theme';
import { spacing } from '@/constants/spacing';
import { radius } from '@/constants/radius';
import { typography } from '@/constants/typography';
import { categoriesApi } from '@/api/categories.api';
import { bannersApi, type PromoBanner } from '@/api/banners.api';
import { sellersApi, type NearbySeller, type NearbySellersPage } from '@/api/sellers.api';
import { favoritesApi } from '@/api/favorites.api';
import { productsApi } from '@/api/products.api';
import { showToast } from '@/lib/toast';
import { useAuthStore } from '@/store/auth.store';
import { useLocationStore } from '@/store/location.store';
import { colors } from '@/constants/colors';

const CATEGORY_ALL = 'all';
const SELLERS_PER_PAGE = 20;
const FEATURED_SHOPS_COUNT = 5;

export default function RefinedHomeScreen() {
  const colors = useThemeColors();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(CATEGORY_ALL);
  const [favoriteOverrides, setFavoriteOverrides] = useState<Record<string, boolean>>({});

  // Store hooks
  const user = useAuthStore((s) => s.user);
  const locationCoords = useLocationStore((s) => s.coords);
  const locationLabel = useLocationStore((s) => s.coords?.label);
  const locationLoading = useLocationStore((s) => s.loading);
  const fetchLocation = useLocationStore((s) => s.fetchLocation);

  // API Queries
  const { data: categoriesData = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.getCategories(),
  });

  const { data: bannersData = [] } = useQuery({
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
        lat: locationCoords?.latitude ?? 0,
        lng: locationCoords?.longitude ?? 0,
        categoryId: selectedCategoryId !== CATEGORY_ALL ? selectedCategoryId : undefined,
        offset: pageParam * SELLERS_PER_PAGE,
        limit: SELLERS_PER_PAGE,
      }),
    getNextPageParam: (lastPage: NearbySellersPage, allPages: any) =>
      lastPage.sellers.length === SELLERS_PER_PAGE ? allPages.length : undefined,
    enabled: !!locationCoords,
  });

  const { data: favoritesData = [] } = useQuery({
    queryKey: ['favorites'],
    queryFn: async () => {
      try {
        return await (productsApi as any).getFavoritedProducts?.() || [];
      } catch {
        return [];
      }
    },
  });

  // Favorite mutation for shops
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

  // Computed data
  const allSellers = useMemo(() => {
    const pages = sellersPages?.pages || [];
    return pages.flatMap((page: NearbySellersPage) => page.sellers || []);
  }, [sellersPages]);

  const shopsList = useMemo(() => {
    return allSellers.map((seller) => ({
      ...seller,
      isFavorited: favoriteOverrides[seller.id] ?? seller.isFavorited,
    }));
  }, [allSellers, favoriteOverrides]);

  const featuredShops = useMemo(
    () => shopsList.slice(0, FEATURED_SHOPS_COUNT),
    [shopsList]
  );

  const spotlightShop = useMemo(() => shopsList[0], [shopsList]);
  const dealHubItems = useMemo(() => shopsList.slice(0, 3), [shopsList]);


  const communityFavorites = useMemo(() => {
    if (!favoritesData) return [];
    return Array.isArray(favoritesData) ? favoritesData.slice(0, 6) : [];
  }, [favoritesData]);

  // Effects
  useEffect(() => {
    if (!locationCoords) {
      fetchLocation();
    }
  }, []);

  // Prefetch products for visible sellers so shop-detail loads instantly
  useEffect(() => {
    const ids = new Set<string>();
    for (const s of shopsList.slice(0, 8)) {
      ids.add(s.id);
    }
    ids.forEach((sellerId) => {
      queryClient.prefetchQuery({
        queryKey: ['sellerProducts', sellerId],
        queryFn: () => productsApi.getSellerProducts(sellerId),
        staleTime: 5 * 60 * 1000,
      });
    });
  }, [shopsList, queryClient]);

  // Handlers
  const onAvatarPress = () => {
    router.push('/(tabs)/profile');
  };

  const onShopPress = (shopId: string) => {
    router.push({
      pathname: '/shop-detail',
      params: { shopId },
    });
  };

  const onSearchPress = () => {
    router.push('/(tabs)/home/search');
  };

  const onNotificationPress = () => {
    router.push('/(tabs)/profile/notifications');
  };

  const onLocationPress = () => {
    router.push('/(tabs)/home/location-selector');
  };

  const onCategoryPress = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
  };

  const onProductPress = (productId: string, shopId: string) => {
    router.push({
      pathname: '/shop-detail',
      params: { id: shopId, productId },
    });
  };

  const handleLoadMore = () => {
    if (!isFetchingNextPage && hasNextPage) {
      fetchNextPage();
    }
  };

  const locationDisplay = locationLoading
    ? 'Getting location...'
    : locationLabel || 'Set location';

  const greeting = `Good ${new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, ${user?.name?.split(' ')[0] || 'there'}`;

  return (
    <ScreenWrapper noPadding>
      <View style={[styles.container]}>
        {/* HEADER */}
        <View style={[styles.header, { paddingTop: spacing.sm }]}>
          {/* Greeting + Location + Avatar */}
          <View style={styles.topRow}>
            <View style={styles.greetingSection}>
              <Text style={[styles.greeting, { color: colors.white }]}>{greeting}</Text>
              <TouchableOpacity style={styles.locationButton} onPress={onLocationPress}>
                <Ionicons name="location" size={16} color={colors.primary} />
                <Text style={[styles.locationText, { color: colors.textSecondary }]} numberOfLines={1}>
                  {locationDisplay}
                </Text>
                <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[styles.avatar, { backgroundColor: colors.primary }]}
              onPress={onAvatarPress}
            >
              <Text style={[styles.avatarText, { color: colors.textLight }]}>
                {user?.name?.[0] || 'U'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <TouchableOpacity
            style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: '#333333' }]}
            onPress={onSearchPress}
            activeOpacity={0.7}
          >
            <Ionicons name="search" size={18} color="#999999" />
            <Text style={[styles.searchPlaceholder, { color: '#999999' }]}>
              Search local shops, artisans...
            </Text>
          </TouchableOpacity>

          {/* Notification Button */}
          {/* <TouchableOpacity style={styles.notificationBtn} onPress={onNotificationPress}>
            <Ionicons name="notifications-outline" size={20} color={colors.white} />
            <View style={[styles.notificationDot, { backgroundColor: colors.error }]} />
          </TouchableOpacity> */}
        </View>

        {/* MAIN SCROLL */}
        <ScrollView
          style={styles.scrollView}
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
            const nearBottom = contentOffset.y + layoutMeasurement.height >= contentSize.height - 300;
            if (nearBottom) handleLoadMore();
          }}
          scrollEventThrottle={150}
        >
          {/* HERO BANNER */}
          {bannersData.length > 0 ? (
            <TouchableOpacity
              style={[styles.heroBanner, { backgroundColor: colors.surfaceDark }]}
              onPress={() => {
                const link = (bannersData[0] as any)?.link || (bannersData[0] as any)?.url;
                if (link) Linking.openURL(link);
              }}
              activeOpacity={0.8}
            >
              <ImageBackground
                source={{ uri: (bannersData[0] as any)?.imageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80' }}
                style={styles.heroBannerImage}
                imageStyle={{ borderRadius: radius.xl }}
              >
                <View style={[styles.heroBannerOverlay, { backgroundColor: 'rgba(0,0,0,0.3)' }]}>
                  <View>
                    <Text style={[styles.heroBadge, { color: colors.primary }]}>
                      {(bannersData[0] as any)?.label || 'Exclusive Offer'}
                    </Text>
                    <Text style={[styles.heroBannerTitle, { color: colors.textLight }]}>
                      {(bannersData[0] as any)?.title || 'Local Shop Gold'}
                    </Text>
                    <Text style={[styles.heroBannerDesc, { color: 'rgba(255,255,255,0.8)' }]}>
                      {(bannersData[0] as any)?.description || 'Flash Sale'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.heroCTA, { backgroundColor: colors.primary }]}
                    onPress={() => {
                      const link = (bannersData[0] as any)?.link || (bannersData[0] as any)?.url;
                      if (link) Linking.openURL(link);
                    }}
                  >
                    <Text style={[styles.heroCTAText, { color: colors.textLight }]}>
                      {(bannersData[0] as any)?.ctaText || 'Shop Now'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </ImageBackground>
            </TouchableOpacity>
          ) : null}

          {/* CATEGORY FILTERS */}
          <View style={styles.categorySection}>
            <Text style={[styles.sectionLabel, { color: colors.white }]}>Our Neighbourhood</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryScroll}
              scrollEventThrottle={16}
            >
              <TouchableOpacity
                style={[
                  styles.categoryPill,
                  selectedCategoryId === CATEGORY_ALL && [
                    styles.categoryPillActive,
                    { backgroundColor: colors.primary },
                  ],
                  selectedCategoryId !== CATEGORY_ALL && {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => onCategoryPress(CATEGORY_ALL)}
              >
                <Text
                  style={[
                    styles.categoryPillText,
                    selectedCategoryId === CATEGORY_ALL && { color: colors.textLight },
                    selectedCategoryId !== CATEGORY_ALL && { color: colors.white },
                  ]}
                >
                  All
                </Text>
              </TouchableOpacity>

              {categoriesData.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryPill,
                    selectedCategoryId === cat.id && [
                      styles.categoryPillActive,
                      { backgroundColor: colors.primary },
                    ],
                    selectedCategoryId !== cat.id && {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => onCategoryPress(cat.id)}
                >
                  <Text
                    style={[
                      styles.categoryPillText,
                      selectedCategoryId === cat.id && { color: '#ffffff' },
                      selectedCategoryId !== cat.id && { color: '#000000' },
                    ]}
                  >
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* FEATURED SHOPS / FLASH SALE */}
          {featuredShops.length > 0 && (
            <View style={styles.featuredSection}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <Ionicons name="flash" size={18} color={colors.primary} />
                  <Text style={[styles.sectionTitle, { color: '#ffffff' }]}>
                    Local Shop Gold
                  </Text>
                </View>
                <TouchableOpacity onPress={() => router.push('/(tabs)/home/sellers')}>
                  <Text style={[styles.viewAllLink, { color: colors.primary }]}>View all</Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.shopCarousel}
                scrollEventThrottle={16}
              >
                {featuredShops.map((shop: NearbySeller) => (
                  <TouchableOpacity
                    key={shop.id}
                    style={[styles.featuredShopCard, { backgroundColor: colors.surface }]}
                    onPress={() => onShopPress(shop.id)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.shopImageContainer}>
                      {shop.imageUrl ? (
                        <Image
                          source={{
                            uri: shop.imageUrl,
                          }}
                          style={styles.shopImage}
                        />
                      ) : (
                        <View style={[styles.shopImage, { backgroundColor: '#e0e0e0', justifyContent: 'center', alignItems: 'center' }]}>
                          <Text style={{ fontSize: 12, color: '#999' }}>No Image</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.shopCardContent}>
                      <Text style={[styles.shopName, { color: '#000000' }]} numberOfLines={1}>
                        {shop.shopName}
                      </Text>
                      <View style={styles.shopMeta}>
                        <Ionicons name="star" size={12} color={colors.primary} />
                        <Text style={[styles.shopRating, { color: '#666666' }]}>
                          {shop.rating?.toFixed(1) || '4.5'}
                        </Text>
                      </View>
                      <Text style={[styles.shopDist, { color: '#999999' }]} numberOfLines={1}>
                        {shop.distance?.toFixed(1) || '0.5'} km away
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* COMMUNITY FAVORITES */}
          {communityFavorites.length > 0 && (
            <View style={styles.favoritesSection}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: '#ffffff' }]}>
                  Community Favorites
                </Text>
              </View>

              <View style={styles.favoritesGrid}>
                {communityFavorites.map((product) => (
                  <TouchableOpacity
                    key={product.id}
                    style={[styles.favoriteCard, { backgroundColor: colors.surface }]}
                    onPress={() => onProductPress(product.id, product.shopId || '')}
                    activeOpacity={0.8}
                  >
                    <View style={styles.favoriteImageContainer}>
                      {product.imageUrl ? (
                        <Image
                          source={{
                            uri: product.imageUrl,
                          }}
                          style={styles.favoriteImage}
                        />
                      ) : (
                        <View style={[styles.favoriteImage, { backgroundColor: '#e0e0e0', justifyContent: 'center', alignItems: 'center' }]}>
                          <Text style={{ fontSize: 10, color: '#999' }}>No Image</Text>
                        </View>
                      )}
                      {product.discount && (
                        <View style={[styles.discountBadge, { backgroundColor: colors.error }]}>
                          <Text style={[styles.discountText, { color: '#ffffff' }]}>
                            {product.discount}%
                          </Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.favoriteInfo}>
                      <Text style={[styles.favoriteName, { color: '#000000' }]} numberOfLines={2}>
                        {product.name}
                      </Text>
                      {product.price && (
                        <Text style={[styles.favoritePrice, { color: colors.primary }]}>
                          ₹{product.price.toLocaleString()}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* SPOTLIGHT SHOP */}
          {spotlightShop && (
            <TouchableOpacity
              style={[styles.spotlightCard, { backgroundColor: colors.surface }]}
              onPress={() => onShopPress(spotlightShop.id)}
              activeOpacity={0.8}
            >
              <ImageBackground
                source={{
                  uri: spotlightShop.imageUrl || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80',
                }}
                style={styles.spotlightImage}
                imageStyle={{ borderRadius: radius.xl }}
              >
                <View style={[styles.spotlightOverlay, { backgroundColor: 'rgba(0,0,0,0.4)' }]}>
                  <View>
                    <View style={styles.spotlightBadgeRow}>
                      <Text style={[styles.spotlightBadge, { color: colors.primary }]}>
                        Featured
                      </Text>
                    </View>
                    <Text style={[styles.spotlightTitle, { color: colors.textLight }]}>
                      {spotlightShop.shopName}
                    </Text>
                    <Text style={[styles.spotlightSubtitle, { color: 'rgba(255,255,255,0.85)' }]}>
                      {spotlightShop.description || 'Premium local shop'}
                    </Text>
                  </View>
                  <View style={styles.spotlightFooter}>
                    <View style={styles.spotlightMeta}>
                      <Ionicons name="star" size={14} color={colors.textLight} />
                      <Text style={[styles.spotlightMetaText, { color: colors.textLight }]}>
                        {spotlightShop.rating?.toFixed(1) || '4.5'} • {spotlightShop.distance?.toFixed(1) || '0.5'} km
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.spotlightCTA, { backgroundColor: colors.primary }]}
                      onPress={() => onShopPress(spotlightShop.id)}
                    >
                      <Text style={[styles.spotlightCTAText, { color: colors.textLight }]}>
                        Explore
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </ImageBackground>
            </TouchableOpacity>
          )}

          {/* NEARBY SHOPS LIST */}
          <View style={styles.nearbySection}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: '#ffffff' }]}>
                Nearby Shops
              </Text>
            </View>

            {sellersLoading && allSellers.length === 0 ? (
              <View style={styles.loadingContainer}>
                <Loader />
              </View>
            ) : allSellers.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="storefront-outline" size={48} color="#666666" />
                <Text style={[styles.emptyStateTitle, { color: '#ffffff' }]}>
                  No shops found
                </Text>
                <Text style={[styles.emptyStateDesc, { color: '#999999' }]}>
                  Try changing your location or category
                </Text>
              </View>
            ) : (
              allSellers.map((shop: NearbySeller) => (
                <TouchableOpacity
                  key={shop.id}
                  style={[styles.shopListCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => onShopPress(shop.id)}
                  activeOpacity={0.8}
                >
                  <View style={styles.shopListImageContainer}>
                    {shop.imageUrl ? (
                      <Image
                        source={{
                          uri: shop.imageUrl,
                        }}
                        style={styles.shopListImage}
                      />
                    ) : (
                      <View style={[styles.shopListImage, { backgroundColor: '#e0e0e0', justifyContent: 'center', alignItems: 'center' }]}>
                        <Text style={{ fontSize: 10, color: '#999' }}>No Image</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.shopListInfo}>
                    <View style={styles.shopListHeader}>
                      <Text style={[styles.shopListName, { color: '#000000' }]} numberOfLines={1}>
                        {shop.shopName}
                      </Text>
                      <View style={styles.shopListRating}>
                        <Ionicons name="star-sharp" size={12} color={colors.primary} />
                        <Text style={[styles.shopListRatingText, { color: '#000000' }]}>
                          {shop.rating?.toFixed(1) || '4.5'}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.shopListDesc, { color: '#666666' }]} numberOfLines={1}>
                      {shop.description || 'Local shop'}
                    </Text>
                    <View style={styles.shopListMetaRow}>
                      <Ionicons name="time-outline" size={12} color="#999999" />
                      <Text style={[styles.shopListMetaText, { color: '#999999' }]}>
                        {shop.prepTimeMinutes ? `${shop.prepTimeMinutes} min` : '15-20 min'}
                      </Text>
                      <Ionicons name="navigate-circle-outline" size={12} color="#999999" style={{ marginLeft: spacing.md }} />
                      <Text style={[styles.shopListMetaText, { color: '#999999' }]}>
                        {shop.distance?.toFixed(1) || '0.5'} km
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#999999" />
                </TouchableOpacity>
              ))
            )}

            {isFetchingNextPage && (
              <View style={styles.loadMoreContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            )}
          </View>
        </ScrollView>



      </View>
    </ScreenWrapper>
  );
}

const createStyles = () =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#0a0a0a',
    },
    header: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.md,
      gap: spacing.md,
    },
    topRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: spacing.md,
    },
    greetingSection: {
      flex: 1,
      gap: spacing.xs,
    },
    greeting: {
      ...typography.screenTitle,
      fontWeight: '700',
      fontSize: 24,
    },
    locationButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    locationText: {
      ...typography.bodySmall,
      fontWeight: '500',
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      ...typography.labelLarge,
      fontWeight: '700',
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      borderRadius: radius.full,
      borderWidth: 1,
    },
    searchPlaceholder: {
      flex: 1,
      ...typography.bodyMedium,
    },
    notificationBtn: {
      position: 'relative',
      padding: spacing.sm,
    },
    notificationDot: {
      position: 'absolute',
      top: spacing.xs,
      right: spacing.xs,
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      gap: spacing.xl,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
    },
    heroBanner: {
      height: 220,
      borderRadius: radius.xl,
      overflow: 'hidden',
    },
    heroBannerImage: {
      width: '100%',
      height: '100%',
      justifyContent: 'space-between',
      padding: spacing.lg,
    },
    heroBannerOverlay: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'space-between',
      padding: spacing.lg,
    },
    heroBadge: {
      ...typography.labelMedium,
      fontWeight: '700',
      marginBottom: spacing.sm,
    },
    heroBannerTitle: {
      ...typography.heading2,
      fontWeight: '700',
      marginBottom: spacing.xs,
    },
    heroBannerDesc: {
      ...typography.bodySmall,
      marginBottom: spacing.md,
    },
    heroCTA: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: radius.lg,
      alignSelf: 'flex-start',
    },
    heroCTAText: {
      ...typography.labelMedium,
      fontWeight: '700',
    },
    categorySection: {
      gap: spacing.md,
    },
    sectionLabel: {
      ...typography.screenTitle,
      fontWeight: '600',
      fontSize: 16,
    },
    categoryScroll: {
      paddingBottom: spacing.xs,
      gap: spacing.sm,
    },
    categoryPill: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.full,
      borderWidth: 1,
    },
    categoryPillActive: {
      borderWidth: 0,
    },
    categoryPillText: {
      ...typography.labelMedium,
      fontWeight: '600',
    },
    featuredSection: {
      gap: spacing.md,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    sectionTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    sectionTitle: {
      ...typography.screenTitle,
      fontWeight: '700',
      fontSize: 18,
    },
    viewAllLink: {
      ...typography.labelMedium,
      fontWeight: '600',
    },
    shopCarousel: {
      gap: spacing.md,
      paddingRight: spacing.lg,
    },
    featuredShopCard: {
      width: 160,
      borderRadius: radius.lg,
      overflow: 'hidden',
    },
    shopImageContainer: {
      height: 120,
      overflow: 'hidden',
      backgroundColor: colors.surfaceMuted,
    },
    shopImage: {
      width: '100%',
      height: '100%',
      resizeMode: 'cover',
    },
    shopCardContent: {
      padding: spacing.md,
      gap: spacing.xs,
    },
    shopName: {
      ...typography.bodySmall,
      fontWeight: '600',
    },
    shopMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    shopRating: {
      ...typography.bodySmall,
    },
    shopDist: {
      ...typography.bodySmall,
    },
    favoritesSection: {
      gap: spacing.md,
    },
    favoritesGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
      justifyContent: 'space-between',
    },
    favoriteCard: {
      width: '48%',
      borderRadius: radius.lg,
      overflow: 'hidden',
    },
    favoriteImageContainer: {
      height: 120,
      position: 'relative',
      overflow: 'hidden',
    },
    favoriteImage: {
      width: '100%',
      height: '100%',
      resizeMode: 'cover',
    },
    discountBadge: {
      position: 'absolute',
      top: spacing.sm,
      right: spacing.sm,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: radius.md,
    },
    discountText: {
      ...typography.labelMedium,
      fontWeight: '700',
    },
    favoriteInfo: {
      padding: spacing.md,
      gap: spacing.xs,
    },
    favoriteName: {
      ...typography.bodySmall,
      fontWeight: '500',
    },
    favoritePrice: {
      ...typography.bodySmall,
      fontWeight: '700',
    },
    spotlightCard: {
      height: 240,
      borderRadius: radius.xl,
      overflow: 'hidden',
    },
    spotlightImage: {
      width: '100%',
      height: '100%',
      justifyContent: 'space-between',
    },
    spotlightOverlay: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'space-between',
      padding: spacing.lg,
    },
    spotlightBadgeRow: {
      marginBottom: spacing.md,
    },
    spotlightBadge: {
      ...typography.labelMedium,
      fontWeight: '700',
    },
    spotlightTitle: {
      ...typography.primary,
      fontWeight: '700',
      marginBottom: spacing.xs,
      fontSize: 22,
    },
    spotlightSubtitle: {
      ...typography.bodyMedium,
      marginBottom: spacing.lg,
    },
    spotlightFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    spotlightMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    spotlightMetaText: {
      ...typography.labelMedium,
    },
    spotlightCTA: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: radius.lg,
    },
    spotlightCTAText: {
      ...typography.bodySmall,
      fontWeight: '700',
    },
    nearbySection: {
      gap: spacing.md,
    },
    loadingContainer: {
      paddingVertical: spacing.xl,
      alignItems: 'center',
    },
    emptyState: {
      paddingVertical: spacing.xl * 2,
      alignItems: 'center',
      gap: spacing.md,
    },
    emptyStateTitle: {
      ...typography.screenTitle,
      fontWeight: '600',
    },
    emptyStateDesc: {
      ...typography.bodyMedium,
    },
    shopListCard: {
      flexDirection: 'row',
      borderRadius: radius.lg,
      borderWidth: 1,
      overflow: 'hidden',
      marginBottom: spacing.md,
      alignItems: 'center',
      gap: spacing.md,
      paddingRight: spacing.md,
    },
    shopListImageContainer: {
      width: 100,
      height: 100,
    },
    shopListImage: {
      width: '100%',
      height: '100%',
      resizeMode: 'cover',
    },
    shopListInfo: {
      flex: 1,
      gap: spacing.xs,
      justifyContent: 'center',
    },
    shopListHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    shopListName: {
      ...typography.bodySmall,
      fontWeight: '700',
      flex: 1,
    },
    shopListRating: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    shopListRatingText: {
      ...typography.bodySmall,
      fontWeight: '600',
    },
    shopListDesc: {
      ...typography.bodySmall,
    },
    shopListMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    shopListMetaText: {
      ...typography.bodySmall,
    },
    loadMoreContainer: {
      paddingVertical: spacing.lg,
      alignItems: 'center',
    },
  });
