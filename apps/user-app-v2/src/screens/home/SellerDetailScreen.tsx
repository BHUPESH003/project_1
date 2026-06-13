import React, { useRef, useState, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  Pressable,
  StyleSheet,
  Animated,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { type NativeStackScreenProps } from '@react-navigation/native-stack';
import { useColors, useTheme } from '@/theme';
import { spacing, radius } from '@/theme/spacing';
import { fontSize, fontWeight } from '@/theme/typography';
import { useSeller, useSellerProducts, useFavoriteToggle } from '@/api/hooks/useSellers';
import { ProductCard } from '@/components/cards/ProductCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { useCartStore } from '@/stores/cartStore';
import type { HomeStackParamList } from '@/navigation/HomeStack';

type Props = NativeStackScreenProps<HomeStackParamList, 'SellerDetail'>;

const HERO_HEIGHT = 220;

type TabKey = 'products' | 'info';

export function SellerDetailScreen({ route, navigation }: Props) {
  const { sellerId, sellerName } = route.params;
  const colors = useColors();
  const { theme } = useTheme();
  const isDark = theme.resolvedMode === 'dark';
  const insets = useSafeAreaInsets();

  const { data: seller, isLoading: sellerLoading } = useSeller(sellerId);
  const { data: productGroups, isLoading: productsLoading } = useSellerProducts(sellerId);
  const favoriteToggle = useFavoriteToggle();
  const [activeTab, setActiveTab] = useState<TabKey>('products');
  const [descExpanded, setDescExpanded] = useState(false);

  const scrollY = useRef(new Animated.Value(0)).current;
  const cartItems = useCartStore((s) => s.items);
  const sellerItems = useMemo(
    () => cartItems.filter((it) => it.sellerId === sellerId),
    [cartItems, sellerId],
  );
  const sellerTotal = useMemo(
    () => sellerItems.reduce((sum, it) => sum + it.price * it.quantity, 0),
    [sellerItems],
  );

  // Parallax: hero translates at 0.5x scroll speed
  const heroTranslate = scrollY.interpolate({
    inputRange: [0, HERO_HEIGHT],
    outputRange: [0, -HERO_HEIGHT * 0.5],
    extrapolate: 'clamp',
  });
  // Nav bar opacity: fade in as hero scrolls away
  const navBgOpacity = scrollY.interpolate({
    inputRange: [HERO_HEIGHT - 60, HERO_HEIGHT],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  function handleFavorite() {
    if (!seller) return;
    favoriteToggle.mutate({
      sellerId: seller.id,
      currentlyFavorited: seller.isFavorited ?? false,
    });
  }

  const isLoading = sellerLoading || productsLoading;

  // True when the seller offers printing services — used to enable the
  // PrintingConfig flow on products (file upload + print options).
  const isPrintingSeller = seller?.categories.some((c) =>
    c.toLowerCase().includes('print'),
  ) ?? false;

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      {/* Animated nav bar overlay */}
      <Animated.View
        style={[
          styles.navBar,
          {
            paddingTop: insets.top + (Platform.OS === 'android' ? 8 : 0),
          },
        ]}
        pointerEvents="box-none"
      >
        {/* Solid bg that fades in */}
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: isDark ? colors.surface : colors.bgElevated, opacity: navBgOpacity },
          ]}
        />
        <View style={styles.navContent}>
          <Pressable
            style={[styles.navBtn, { backgroundColor: 'rgba(0,0,0,0.3)' }]}
            onPress={() => navigation.goBack()}
            hitSlop={8}
          >
            <Text style={styles.navBtnText}>←</Text>
          </Pressable>
          <Animated.Text
            style={[styles.navTitle, { color: colors.text, opacity: navBgOpacity }]}
            numberOfLines={1}
          >
            {seller?.name ?? sellerName ?? 'Shop'}
          </Animated.Text>
          <Pressable
            style={[styles.navBtn, { backgroundColor: 'rgba(0,0,0,0.3)' }]}
            onPress={handleFavorite}
            hitSlop={8}
          >
            <Text style={styles.navBtnText}>
              {seller?.isFavorited ? '♥' : '♡'}
            </Text>
          </Pressable>
        </View>
      </Animated.View>

      {/* Main scrollable content */}
      <Animated.ScrollView
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true },
        )}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          // Leave space for: sticky cart bar (56px) + tab bar (~80px) + safe area
          paddingBottom: sellerItems.length > 0
            ? 72 + Math.max(insets.bottom, 8) + 64
            : 72 + Math.max(insets.bottom, 8) + 16,
        }}
      >
        {/* Hero */}
        <View style={styles.heroContainer}>
          <Animated.View
            style={[
              styles.hero,
              { transform: [{ translateY: heroTranslate }] },
            ]}
          >
            {seller?.coverImageUrl ? (
              <Image
                source={{ uri: seller.coverImageUrl }}
                style={styles.heroImage}
                resizeMode="cover"
              />
            ) : (
              <LinearGradient
                colors={['#0b8a93', '#10aab3']}
                style={styles.heroImage}
              >
                <Text style={styles.heroPlaceholderIcon}>🏪</Text>
              </LinearGradient>
            )}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.55)']}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </View>

        {/* Info section */}
        {isLoading ? (
          <View style={[styles.infoSection, { backgroundColor: colors.bg }]}>
            <Skeleton width="70%" height={24} />
            <Skeleton width="50%" height={16} style={{ marginTop: 8 }} />
            <Skeleton width="85%" height={14} style={{ marginTop: 8 }} />
          </View>
        ) : seller ? (
          <View style={[styles.infoSection, { backgroundColor: colors.bg }]}>
            {/* Name + status */}
            <View style={styles.nameStatusRow}>
              <Text style={[styles.shopName, { color: colors.text }]}>
                {seller.name}
              </Text>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: seller.isOnline
                      ? colors.successSoft
                      : colors.surface2,
                  },
                ]}
              >
                <View
                  style={[
                    styles.statusDot,
                    {
                      backgroundColor: seller.isOnline
                        ? colors.success
                        : colors.text3,
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.statusText,
                    {
                      color: seller.isOnline ? colors.success : colors.text3,
                    },
                  ]}
                >
                  {seller.isOnline ? 'Open' : 'Closed'}
                </Text>
              </View>
            </View>

            {/* Meta row */}
            <View style={styles.metaRow}>
              <MetaChip icon="★" text={seller.rating.toFixed(1)} colors={colors} />
              {seller.distance != null && (
                <MetaChip
                  icon="📍"
                  text={
                    seller.distance < 1
                      ? `${Math.round(seller.distance * 1000)}m`
                      : `${seller.distance.toFixed(1)}km`
                  }
                  colors={colors}
                />
              )}
              {seller.prepTime && (
                <MetaChip
                  icon="⏱"
                  text={`~${seller.prepTime}m`}
                  colors={colors}
                />
              )}
            </View>

            {/* Description */}
            {seller.description ? (
              <Pressable onPress={() => setDescExpanded((v) => !v)}>
                <Text
                  style={[styles.description, { color: colors.text2 }]}
                  numberOfLines={descExpanded ? undefined : 2}
                >
                  {seller.description}
                </Text>
                {seller.description.length > 80 && (
                  <Text style={[styles.readMore, { color: colors.primary }]}>
                    {descExpanded ? 'Read less' : 'Read more'}
                  </Text>
                )}
              </Pressable>
            ) : null}

            {/* Starting price chips */}
            {seller.startingPrice ? (
              <View
                style={[
                  styles.priceChip,
                  {
                    backgroundColor: colors.primarySoft,
                    borderColor: colors.primarySoftBorder,
                  },
                ]}
              >
                <Text style={[styles.priceChipText, { color: colors.primary }]}>
                  From {seller.startingPrice}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Tab bar */}
        <View
          style={[
            styles.tabBar,
            { borderBottomColor: colors.border, backgroundColor: colors.bg },
          ]}
        >
          {(['products', 'info'] as TabKey[]).map((tab) => (
            <Pressable
              key={tab}
              style={[
                styles.tab,
                {
                  borderBottomColor:
                    activeTab === tab ? colors.primary : 'transparent',
                },
              ]}
              onPress={() => setActiveTab(tab)}
            >
              <Text
                style={[
                  styles.tabText,
                  {
                    color:
                      activeTab === tab ? colors.primary : colors.text2,
                    fontWeight:
                      activeTab === tab ? fontWeight.bold : fontWeight.medium,
                  },
                ]}
              >
                {tab === 'products' ? 'Products' : 'Info'}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Products tab */}
        {activeTab === 'products' && (
          <View style={styles.productsTab}>
            {productsLoading ? (
              <View style={styles.productsLoading}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : !productGroups || productGroups.length === 0 ? (
              <View style={styles.noProducts}>
                <Text style={[styles.noProductsText, { color: colors.text2 }]}>
                  No products listed yet
                </Text>
              </View>
            ) : (
              productGroups.map((group) => (
                <View key={group.categoryId} style={styles.categoryGroup}>
                  <Text
                    style={[styles.categoryName, { color: colors.text, borderBottomColor: colors.borderFaint }]}
                  >
                    {group.categoryName}
                  </Text>
                  {group.products.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      sellerId={sellerId}
                      sellerName={seller?.name ?? sellerName ?? ''}
                      onPrintingPress={
                        isPrintingSeller
                          ? () =>
                              navigation.navigate('PrintingConfig', {
                                productId: product.id,
                                sellerId,
                                sellerName: seller?.name ?? sellerName ?? '',
                                productName: product.name,
                                price: product.price,
                              })
                          : undefined
                      }
                    />
                  ))}
                </View>
              ))
            )}
          </View>
        )}

        {/* Info tab */}
        {activeTab === 'info' && seller && (
          <View style={[styles.infoTab, { backgroundColor: colors.bg }]}>
            {seller.address && (
              <InfoRow
                label="Address"
                value={`${seller.address.line1}, ${seller.address.city}`}
                colors={colors}
              />
            )}
            <InfoRow
              label="Status"
              value={seller.isOnline ? 'Currently open' : 'Currently closed'}
              colors={colors}
            />
            <InfoRow
              label="Rating"
              value={`${seller.rating.toFixed(1)} (${seller.reviewCount} reviews)`}
              colors={colors}
            />
            {seller.categories.length > 0 && (
              <InfoRow
                label="Categories"
                value={seller.categories.join(', ')}
                colors={colors}
              />
            )}
          </View>
        )}
      </Animated.ScrollView>

      {/* Sticky bottom cart bar for this seller */}
      {sellerItems.length > 0 && (
        <View
          style={[
            styles.stickyCart,
            {
              backgroundColor: colors.surfaceInverse,
              // 72 = tab bar content height, Math.max(insets.bottom, 8) = safe area
              bottom: 72 + Math.max(insets.bottom, 8),
              paddingBottom: spacing.md,
            },
          ]}
        >
          <View style={styles.stickyCartInner}>
            <Text style={[styles.cartCount, { color: colors.bg }]}>
              {sellerItems.reduce((s, it) => s + it.quantity, 0)} items · ₹{sellerTotal}
            </Text>
            <Pressable
              style={[styles.cartBtn, { backgroundColor: colors.primary }]}
              onPress={() => navigation.navigate('Cart')}
            >
              <Text style={[styles.cartBtnText, { color: '#fff' }]}>
                View cart →
              </Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

// ─── Helper components ────────────────────────────────────────────────────────

function MetaChip({
  icon,
  text,
  colors,
}: {
  icon: string;
  text: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View
      style={[
        styles.metaChip,
        { backgroundColor: colors.surface2, borderColor: colors.borderFaint },
      ]}
    >
      <Text style={styles.metaChipIcon}>{icon}</Text>
      <Text style={[styles.metaChipText, { color: colors.text2 }]}>{text}</Text>
    </View>
  );
}

function InfoRow({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={[styles.infoRow, { borderBottomColor: colors.borderFaint }]}>
      <Text style={[styles.infoLabel, { color: colors.text3 }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1 },

  // Nav bar
  navBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  navContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnText: { color: '#fff', fontSize: 18, fontWeight: fontWeight.bold },
  navTitle: { flex: 1, fontSize: fontSize.body, fontWeight: fontWeight.bold },

  // Hero
  heroContainer: { height: HERO_HEIGHT, overflow: 'hidden' },
  hero: {
    height: HERO_HEIGHT + 60, // extra to allow parallax movement
    width: '100%',
  },
  heroImage: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  heroPlaceholderIcon: { fontSize: 60 },

  // Info section
  infoSection: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  nameStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  shopName: { fontSize: fontSize.display, fontWeight: fontWeight.bold, flex: 1 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: fontSize.caption, fontWeight: fontWeight.semibold },
  metaRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.xs,
    borderWidth: 1,
  },
  metaChipIcon: { fontSize: 12 },
  metaChipText: { fontSize: fontSize.caption, fontWeight: fontWeight.medium },
  description: { fontSize: fontSize.body, lineHeight: 22 },
  readMore: { fontSize: fontSize.caption, fontWeight: fontWeight.semibold, marginTop: 4 },
  priceChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  priceChipText: { fontSize: fontSize.subhead, fontWeight: fontWeight.semibold },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 2,
  },
  tabText: { fontSize: fontSize.body },

  // Products tab
  productsTab: {},
  productsLoading: { padding: spacing['3xl'], alignItems: 'center' },
  noProducts: { padding: spacing['3xl'], alignItems: 'center' },
  noProductsText: { fontSize: fontSize.body },
  categoryGroup: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg },
  categoryName: {
    fontSize: fontSize.subhead,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    marginBottom: spacing.sm,
  },

  // Info tab
  infoTab: { paddingTop: spacing.sm },
  infoRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing.md,
  },
  infoLabel: { fontSize: fontSize.subhead, fontWeight: fontWeight.medium, width: 90 },
  infoValue: { flex: 1, fontSize: fontSize.subhead },

  // Sticky cart bar
  stickyCart: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  stickyCartInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.sm,
  },
  cartCount: { fontSize: fontSize.body, fontWeight: fontWeight.semibold },
  cartBtn: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  cartBtnText: { fontSize: fontSize.body, fontWeight: fontWeight.bold },
});
