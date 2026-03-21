/**
 * Delivery Options Screen – Step 2/3
 *
 * Per-seller delivery option selection with auto-select cheapest,
 * dynamic total ticker, and floating CTA.
 *
 * Visual source: stitch/checkout_flow/delivery_options
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useCheckoutStore, type DeliveryOption } from '@/store/checkout.store';
import { useAddressStore } from '@/store/address.store';
import { MultiCartCheckoutService } from '@/services/multiCartCheckout.service';
import { multiCartOrdersApi } from '@/api/multiCartOrders.api';
import { showToast } from '@/lib/toast';

// ── Design Tokens ────────────────────────────────
const C = {
  bg: '#0b0f0f',
  slate950: '#020617',
  slate900: '#111827',
  slate800: '#1e293b',
  slate700: '#334155',
  slate600: '#475569',
  slate500: '#64748b',
  slate400: '#94a3b8',
  slate300: '#cbd5e1',
  slate100: '#f1f5f9',
  teal900_30: 'rgba(19, 78, 74, 0.3)',
  teal600: '#0d9488',
  teal500: '#14b8a6',
  teal400: '#2dd4bf',
  teal300: '#5eead4',
  teal100: '#ccfbf1',
  tertiaryDim: '#863e26',
  secondaryContainer: '#ffdeaa',
  onSecondaryContainer: '#664e23',
  white: '#ffffff',
} as const;

const SELLER_ICONS: Record<string, string> = {
  bakery: 'bakery-dining',
  bread: 'bakery-dining',
  farm: 'local-florist',
  fresh: 'local-florist',
  grocer: 'local-florist',
  default: 'store',
};

function getSellerIcon(cat?: string): string {
  if (!cat) return SELLER_ICONS.default!;
  const lower = cat.toLowerCase();
  for (const [key, icon] of Object.entries(SELLER_ICONS)) {
    if (lower.includes(key)) return icon;
  }
  return SELLER_ICONS.default!;
}

export default function DeliveryOptionsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const sellers = useCheckoutStore((s) => s.sellers);
  const selectedAddress = useCheckoutStore((s) => s.selectedAddress);
  const grandTotal = useCheckoutStore((s) => s.grandTotal);
  const deliveryTotal = useCheckoutStore((s) => s.deliveryTotal);
  const setDeliveryOptions = useCheckoutStore((s) => s.setDeliveryOptions);
  const selectDeliveryOption = useCheckoutStore((s) => s.selectDeliveryOption);
  const setOrders = useCheckoutStore((s) => s.setOrders);
  const setStep = useCheckoutStore((s) => s.setStep);

  const [loading, setLoading] = useState(true);
  const [creatingOrders, setCreatingOrders] = useState(true);

  // ── On mount: create orders → fetch delivery quotes ──
  useEffect(() => {
    let cancelled = false;

    async function fetchAll() {
      setLoading(true);
      try {
        const addrMode = useCheckoutStore.getState().addressMode;
        const mainAddr = useCheckoutStore.getState().selectedAddress;
        const perSellerAddrs = useCheckoutStore.getState().perSellerAddresses;

        // Step 1: Create orders
        setCreatingOrders(true);
        
        // Prepare global address
        const globalAddr = mainAddr
          ? {
              latitude: mainAddr.lat,
              longitude: mainAddr.lng,
              address: mainAddr.fullAddress,
            }
          : { latitude: 0, longitude: 0, address: '' };

        // Prepare per-seller addresses map if in 'different' mode
        let deliveryAddressesMap: Record<string, { latitude: number; longitude: number; address: string }> | undefined;
        if (addrMode === 'different') {
          deliveryAddressesMap = {};
          Object.entries(perSellerAddrs).forEach(([sid, addr]) => {
            deliveryAddressesMap![sid] = {
              latitude: addr.lat,
              longitude: addr.lng,
              address: addr.fullAddress,
            };
          });
        }

        const createdOrders = await MultiCartCheckoutService.createAllOrders(
          globalAddr,
          deliveryAddressesMap
        );

        if (cancelled) return;

        const orderRefs = createdOrders.map((o) => ({
          orderId: o.orderId,
          sellerId: o.sellerId,
          sellerName: o.sellerName,
          subtotal: o.subtotal,
          pricing: o.pricing,
        }));
        setOrders(orderRefs);
        setCreatingOrders(false);

        // Step 2: Fetch delivery quotes for each order
        const quotesResponse = await multiCartOrdersApi.getMultipleDeliveryQuotes({
          orders: orderRefs.map((o) => ({ orderId: o.orderId, sellerId: o.sellerId })),
          deliveryAddress: globalAddr,
        });

        if (cancelled) return;

        // Apply quotes to checkout store
        quotesResponse.orders.forEach((quote) => {
          const options: DeliveryOption[] = quote.providers.map((p) => ({
            id: p.provider,
            provider: p.provider,
            displayName: p.displayName,
            estimatedFee: p.estimatedFee,
            estimatedDurationMinutes: p.estimatedDurationMinutes,
            rating: p.rating,
            quoteId: p.quoteId,
            badge: null,
          }));
          // Find which seller this order belongs to
          const matchingSeller = sellers.find((s) => s.sellerId === quote.sellerId);
          if (matchingSeller) {
            setDeliveryOptions(matchingSeller.sellerId, options);
          }
        });

        setStep('delivery');
      } catch (err: any) {
        console.error('Failed to fetch delivery options:', err);
        showToast({
          type: 'error',
          message: err?.message ?? 'Failed to load delivery options',
          duration: 3000,
        });
      } finally {
        if (!cancelled) {
          setLoading(false);
          setCreatingOrders(false);
        }
      }
    }

    fetchAll();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSelectOption = useCallback(
    (sellerId: string, optionId: string) => {
      selectDeliveryOption(sellerId, optionId);
    },
    [selectDeliveryOption],
  );

  const handleContinue = useCallback(() => {
    router.push('/(root)/payment');
  }, [router]);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  // ── Loading state ────────────────────────────
  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
              <MaterialIcons name="arrow-back" size={24} color={C.teal400} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Checkout</Text>
          </View>
          <View style={styles.stepPill}>
            <Text style={styles.stepText}>Step 2 of 3</Text>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={C.teal400} />
          <Text style={styles.loadingText}>
            {creatingOrders ? 'Creating orders...' : 'Loading delivery options...'}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* ── Header ──────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
            <MaterialIcons name="arrow-back" size={24} color={C.teal400} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Checkout</Text>
        </View>
        <View style={styles.stepPill}>
          <Text style={styles.stepText}>Step 2 of 3</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 280 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Section Title ─────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Delivery Options</Text>
          <MaterialIcons name="local-shipping" size={24} color={C.teal400} />
        </View>

        {/* ── Per-Seller Delivery Options ───── */}
        {sellers.map((seller) => {
          const iconName = getSellerIcon(seller.category);
          return (
            <View key={seller.sellerId} style={styles.sellerGroup}>
              {/* Seller header */}
              <View style={styles.sellerGroupHeader}>
                <View style={styles.sellerGroupInfo}>
                  <View style={styles.sellerGroupIcon}>
                    <MaterialIcons
                      name={iconName as any}
                      size={24}
                      color={C.teal400}
                    />
                  </View>
                  <Text style={styles.sellerGroupName}>{seller.sellerName}</Text>
                </View>
              </View>

              {/* Delivery options */}
              <View style={styles.optionsContainer}>
                {seller.deliveryOptions.map((opt) => {
                  const isSelected = seller.selectedDeliveryOptionId === opt.id;
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      activeOpacity={0.7}
                      onPress={() => handleSelectOption(seller.sellerId, opt.id)}
                      style={styles.optionTouchable}
                    >
                      {/* Selected overlay */}
                      <View
                        style={[
                          styles.optionBorder,
                          isSelected
                            ? styles.optionBorderSelected
                            : styles.optionBorderDefault,
                        ]}
                      />

                      <View
                        style={[
                          styles.optionInner,
                          isSelected && styles.optionInnerSelected,
                        ]}
                      >
                        <View style={styles.optionLeft}>
                          {/* Radio circle */}
                          {isSelected ? (
                            <View style={styles.radioSelected}>
                              <MaterialIcons
                                name="check"
                                size={14}
                                color={C.white}
                              />
                            </View>
                          ) : (
                            <View style={styles.radioUnselected} />
                          )}

                          <View>
                            <View style={styles.optionNameRow}>
                              <Text
                                style={[
                                  styles.optionName,
                                  isSelected
                                    ? styles.optionNameSelected
                                    : styles.optionNameDefault,
                                ]}
                              >
                                {opt.displayName}
                              </Text>
                              {opt.badge && (
                                <View
                                  style={[
                                    styles.badge,
                                    opt.badge === 'FASTEST'
                                      ? styles.badgeFastest
                                      : styles.badgeBestValue,
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.badgeText,
                                      opt.badge === 'FASTEST'
                                        ? styles.badgeTextFastest
                                        : styles.badgeTextBestValue,
                                    ]}
                                  >
                                    {opt.badge}
                                  </Text>
                                </View>
                              )}
                            </View>
                            <Text
                              style={[
                                styles.optionEta,
                                isSelected
                                  ? { color: C.slate400 }
                                  : { color: C.slate500 },
                              ]}
                            >
                              Arrives in {opt.estimatedDurationMinutes} mins
                            </Text>
                          </View>
                        </View>

                        <Text
                          style={[
                            styles.optionPrice,
                            isSelected
                              ? { color: C.teal400 }
                              : { color: C.slate300 },
                          ]}
                        >
                          ₹{opt.estimatedFee}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}

                {seller.deliveryOptions.length === 0 && (
                  <View style={styles.noOptions}>
                    <Text style={styles.noOptionsText}>
                      No delivery options available
                    </Text>
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* ── Floating Bottom ─────────────────── */}
      <View style={[styles.bottomArea, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        {/* Delivery total ticker */}
        <View style={styles.deliveryTicker}>
          <View style={styles.tickerLeft}>
            <MaterialIcons name="delivery-dining" size={20} color={C.slate400} />
            <Text style={styles.tickerLabel}>Total Delivery Fee</Text>
          </View>
          <Text style={styles.tickerValue}>₹{deliveryTotal.toFixed(2)}</Text>
        </View>

        {/* Sticky CTA */}
        <View style={styles.ctaShell}>
          <View style={styles.ctaHeader}>
            <View>
              <Text style={styles.ctaOrderLabel}>ORDER TOTAL</Text>
              <Text style={styles.ctaOrderAmount}>₹{grandTotal.toFixed(2)}</Text>
            </View>
            <View style={styles.ctaIcons}>
              <View style={styles.ctaIconCircle}>
                <MaterialIcons name="shopping-bag" size={18} color={C.slate400} />
              </View>
              <View style={[styles.ctaIconCircle, styles.ctaIconTeal]}>
                <MaterialIcons name="payments" size={18} color={C.white} />
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={styles.ctaButton}
            activeOpacity={0.85}
            onPress={handleContinue}
          >
            <LinearGradient
              colors={[C.teal600, C.teal500]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ctaGradient}
            >
              <Text style={styles.ctaText}>Proceed to Payment</Text>
              <MaterialIcons name="arrow-forward" size={20} color={C.white} />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: 'rgba(17, 24, 39, 0.8)',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  backBtn: { padding: 8, borderRadius: 999 },
  headerTitle: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: C.teal400,
  },
  stepPill: {
    backgroundColor: C.teal900_30,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  stepText: {
    fontSize: 12,
    fontWeight: '700',
    color: C.teal400,
    letterSpacing: 0.5,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: { fontSize: 14, color: C.slate400 },

  // Scroll
  scrollArea: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 32 },

  // Section
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  sectionTitle: {
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: C.teal300,
  },

  // Seller group
  sellerGroup: {
    marginBottom: 32,
    padding: 4,
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    borderRadius: 28,
    overflow: 'hidden',
  },
  sellerGroupHeader: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  sellerGroupInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sellerGroupIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: C.teal900_30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sellerGroupName: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 18,
    fontWeight: '700',
    color: C.teal100 || C.slate100,
  },

  // Options
  optionsContainer: { padding: 16, gap: 16 },
  optionTouchable: { position: 'relative' },
  optionBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
    borderWidth: 2,
  },
  optionBorderSelected: {
    borderColor: 'rgba(20, 184, 166, 0.5)',
    backgroundColor: 'rgba(20, 184, 166, 0.08)',
  },
  optionBorderDefault: {
    borderColor: 'transparent',
    backgroundColor: 'rgba(30, 41, 59, 0.2)',
  },
  optionInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderRadius: 16,
  },
  optionInnerSelected: {},
  optionLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  radioSelected: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: C.teal500,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioUnselected: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: C.slate600,
  },
  optionNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  optionName: { fontWeight: '600', fontSize: 15 },
  optionNameSelected: { color: C.slate100 },
  optionNameDefault: { color: C.slate300 },
  optionEta: { fontSize: 13, marginTop: 2 },
  optionPrice: {
    fontSize: 20,
    fontWeight: '700',
  },

  // Badges
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  badgeFastest: { backgroundColor: C.tertiaryDim },
  badgeBestValue: { backgroundColor: C.secondaryContainer },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  badgeTextFastest: { color: C.white },
  badgeTextBestValue: { color: C.onSecondaryContainer },

  noOptions: { padding: 20, alignItems: 'center' },
  noOptionsText: { color: C.slate500, fontSize: 14 },

  // Bottom area
  bottomArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },

  // Delivery ticker
  deliveryTicker: {
    marginHorizontal: 24,
    marginBottom: 16,
    backgroundColor: 'rgba(17, 24, 39, 0.9)',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: C.slate800,
  },
  tickerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tickerLabel: { fontSize: 14, fontWeight: '500', color: C.slate300 },
  tickerValue: {
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontSize: 20,
    fontWeight: '900',
    color: C.teal400,
  },

  // CTA shell
  ctaShell: {
    backgroundColor: C.slate900,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 16,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderTopWidth: 1,
    borderTopColor: C.slate800,
  },
  ctaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  ctaOrderLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: C.slate500,
    textTransform: 'uppercase',
  },
  ctaOrderAmount: {
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontSize: 24,
    fontWeight: '900',
    color: C.teal400,
  },
  ctaIcons: { flexDirection: 'row', marginLeft: -12 },
  ctaIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: C.slate900,
    backgroundColor: C.slate800,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ctaIconTeal: { backgroundColor: C.teal500, marginLeft: -12 },

  ctaButton: { borderRadius: 999, overflow: 'hidden' },
  ctaGradient: {
    paddingVertical: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderRadius: 999,
  },
  ctaText: {
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontSize: 16,
    fontWeight: '800',
    color: C.white,
  },
});
