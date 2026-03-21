/**
 * Checkout Screen – Step 1/3
 *
 * Shows per-seller item cards, address selector, bill summary,
 * and a sticky "Continue to Payment" CTA.
 *
 * Visual source: stitch/checkout_flow/checkout
 */
import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useMultiCartStore } from '@/store/multiCartStore';
import { useCheckoutStore } from '@/store/checkout.store';
import { useAddressStore } from '@/store/address.store';
import { AddressSelector } from '@/components/AddressSelector';

// ── Design Tokens (from Stitch) ──────────────────────
const C = {
  bg: '#0b0f0f',
  slate900: '#111827',
  slate800: '#1e293b',
  slate700: '#334155',
  slate600: '#475569',
  slate500: '#64748b',
  slate400: '#94a3b8',
  slate300: '#cbd5e1',
  slate200: '#e2e8f0',
  slate100: '#f1f5f9',
  teal900: 'rgba(19, 78, 74, 0.3)',
  teal600: '#0d9488',
  teal500: '#14b8a6',
  teal400: '#2dd4bf',
  teal300: '#5eead4',
  amber900: 'rgba(120, 53, 15, 0.4)',
  amber300: '#fcd34d',
  white: '#ffffff',
} as const;

export default function CheckoutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // ── Stores ───────────────────────────────────
  const allCarts = useMultiCartStore((s) => s.carts);
  const selectedAddress = useAddressStore((s) => s.selectedAddress);
  const setSelectorVisible = useAddressStore((s) => s.setSelectorVisible);

  const sellers = useCheckoutStore((s) => s.sellers);
  const itemTotal = useCheckoutStore((s) => s.itemTotal);
  const taxesAndFees = useCheckoutStore((s) => s.taxesAndFees);
  const deliveryTotal = useCheckoutStore((s) => s.deliveryTotal);
  const grandTotal = useCheckoutStore((s) => s.grandTotal);
  const initFromCarts = useCheckoutStore((s) => s.initFromCarts);

  const addressMode = useCheckoutStore((s) => s.addressMode);
  const setAddressMode = useCheckoutStore((s) => s.setAddressMode);
  const getSellerAddress = useCheckoutStore((s) => s.getSellerAddress);
  const setPerSellerAddress = useCheckoutStore((s) => s.setPerSellerAddress);
  const serviceFee = useCheckoutStore((s) => s.serviceFee);

  const [pickingForSellerId, setPickingForSellerId] = React.useState<string | null>(null);
  const [localSelectorVisible, setLocalSelectorVisible] = React.useState(false);

  // ── Initialize on mount ──────────────────────
  useEffect(() => {
    const carts = Object.values(allCarts).filter((c) => c.items.length > 0);
    const addr = selectedAddress
      ? {
          label: selectedAddress.label || 'Home',
          fullAddress: selectedAddress.fullAddress,
          lat: selectedAddress.lat,
          lng: selectedAddress.lng,
        }
      : null;
    initFromCarts(carts, addr);
  }, []);

  const handleContinue = useCallback(() => {
    router.push('/(root)/delivery-options');
  }, [router]);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleChangeAddress = useCallback(() => {
    setSelectorVisible(true);
  }, [setSelectorVisible]);

  // ── Item summary text helper ─────────────────
  const itemSummary = (items: any[]) => {
    return items.map((i) => `${i.quantity}x ${i.name}`).join(', ');
  };

  const handleSelectSellerAddress = useCallback((addr: any) => {
    if (pickingForSellerId) {
      setPerSellerAddress(pickingForSellerId, {
        id: addr.id,
        label: addr.label,
        fullAddress: addr.fullAddress,
        lat: addr.lat,
        lng: addr.lng,
      });
      setPickingForSellerId(null);
      setLocalSelectorVisible(false);
    }
  }, [pickingForSellerId, setPerSellerAddress]);

  const getCategoryColor = (cat?: string) => {
    const lower = cat?.toLowerCase() ?? '';
    if (lower.includes('bake') || lower.includes('bread')) return { bg: C.teal900, text: C.teal300 };
    if (lower.includes('farm') || lower.includes('fresh') || lower.includes('grocer'))
      return { bg: C.amber900, text: C.amber300 };
    return { bg: C.teal900, text: C.teal300 };
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* ── Header ──────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
            <MaterialIcons name="arrow-back" size={26} color={C.teal400} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Checkout</Text>
        </View>
        <View style={styles.secureBadge}>
          <MaterialIcons name="lock" size={16} color={C.teal500} />
          <Text style={styles.secureText}>Secure</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 200 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Address Mode Toggle ─────────────────── */}
        <View style={styles.modeContainer}>
          <TouchableOpacity 
            style={[styles.modeBtn, addressMode === 'same' && styles.modeBtnActive]}
            onPress={() => setAddressMode('same')}
          >
            <Text style={[styles.modeText, addressMode === 'same' && styles.modeTextActive]}>Single Address</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.modeBtn, addressMode === 'different' && styles.modeBtnActive]}
            onPress={() => setAddressMode('different')}
          >
            <Text style={[styles.modeText, addressMode === 'different' && styles.modeTextActive]}>Per Seller</Text>
          </TouchableOpacity>
        </View>

        {/* ── Global Address Card (Same Mode) ─────── */}
        {addressMode === 'same' && (
          <View style={styles.addressCard}>
            <View style={styles.addressLeft}>
              <View style={styles.addressIcon}>
                <MaterialIcons name="home" size={24} color={C.teal400} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.addressLabel}>
                  {selectedAddress?.label ?? 'Home'}
                </Text>
                <Text style={styles.addressDetail} numberOfLines={1}>
                  {selectedAddress?.fullAddress ?? 'Select an address'}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={handleChangeAddress}>
              <Text style={styles.changeBtn}>Change</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Order Details ─────────────────────── */}
        <Text style={styles.sectionTitle}>Order Details</Text>

        {sellers.map((seller) => {
          const catColor = getCategoryColor(seller.category);
          const sellerAddr = getSellerAddress(seller.sellerId);
          
          return (
            <View key={seller.sellerId} style={styles.sellerCard}>
              <View style={styles.sellerCardInner}>
                {/* Seller header */}
                <View style={styles.sellerHeader}>
                  <View style={styles.sellerInfo}>
                    <View style={styles.sellerAvatar}>
                      {seller.sellerLogo ? (
                        <Image
                          source={{ uri: seller.sellerLogo }}
                          style={styles.sellerAvatarImg}
                        />
                      ) : (
                        <MaterialIcons name="store" size={24} color={C.slate400} />
                      )}
                    </View>
                    <View>
                      <Text style={styles.sellerName}>{seller.sellerName}</Text>
                      {seller.category && (
                        <View
                          style={[
                            styles.categoryChip,
                            { backgroundColor: catColor.bg },
                          ]}
                        >
                          <Text
                            style={[styles.categoryText, { color: catColor.text }]}
                          >
                            {seller.category.toUpperCase()}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <TouchableOpacity onPress={handleBack}>
                    <Text style={styles.editBtn}>Edit items</Text>
                  </TouchableOpacity>
                </View>

                {/* Per-Seller Address (Different Mode) */}
                {addressMode === 'different' && (
                  <View style={styles.perSellerAddressSection}>
                    {sellerAddr ? (
                      <View style={styles.selectedSellerAddressCard}>
                        <View style={styles.selectedAddressIcon}>
                          <MaterialIcons name="location-pin" size={18} color={C.teal400} />
                        </View>
                        <View style={styles.selectedAddressInfo}>
                          <Text style={styles.selectedAddressLabel}>{sellerAddr.label}</Text>
                          <Text style={styles.selectedAddressFull} numberOfLines={1}>
                            {sellerAddr.fullAddress}
                          </Text>
                        </View>
                        <TouchableOpacity 
                          onPress={() => {
                            setPickingForSellerId(seller.sellerId);
                            setLocalSelectorVisible(true);
                          }}
                          style={styles.sellerChangeBtn}
                        >
                          <Text style={styles.sellerChangeText}>Edit</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity 
                        style={styles.sellerAddressLine}
                        onPress={() => {
                          setPickingForSellerId(seller.sellerId);
                          setLocalSelectorVisible(true);
                        }}
                      >
                        <MaterialIcons name="location-on" size={16} color={C.teal400} />
                        <Text style={styles.sellerAddressText} numberOfLines={1}>
                          Choose delivery address
                        </Text>
                        <MaterialIcons name="chevron-right" size={16} color={C.slate500} />
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {/* Items + subtotal */}
                <View style={styles.sellerDivider} />
                <View style={styles.sellerFooter}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemsText}>{itemSummary(seller.items)}</Text>
                    <Text style={styles.etaText}>
                      Delivery location: {sellerAddr?.label || 'TBD'}
                    </Text>
                  </View>
                  <Text style={styles.subtotalText}>
                    ₹{seller.subtotal.toFixed(2)}
                  </Text>
                </View>
              </View>
            </View>
          );
        })}

        {/* ── Bill Summary ──────────────────────── */}
        <View style={styles.billCard}>
          <Text style={styles.billTitle}>Bill Summary</Text>
          <View style={styles.billRows}>
            <View style={styles.billRow}>
              <Text style={styles.billLabel}>Item total</Text>
              <Text style={styles.billValue}>₹{itemTotal.toFixed(2)}</Text>
            </View>
            {taxesAndFees > 0 && (
              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Taxes & charges</Text>
                <Text style={styles.billValue}>₹{taxesAndFees.toFixed(2)}</Text>
              </View>
            )}
            {serviceFee > 0 && (
              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Service fee</Text>
                <Text style={styles.billValue}>₹{serviceFee.toFixed(2)}</Text>
              </View>
            )}
            <View style={styles.billRow}>
              <Text style={styles.billLabel}>Delivery Fee</Text>
              <Text style={[styles.billValue, { color: C.teal400 }]}>
                {deliveryTotal > 0 ? `₹${deliveryTotal.toFixed(2)}` : 'Calculated at next step'}
              </Text>
            </View>
            <View style={styles.billDivider} />
            <View style={styles.billRow}>
              <Text style={styles.grandLabel}>Grand total</Text>
              <Text style={styles.grandValue}>₹{grandTotal.toFixed(2)}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* ── Sticky Bottom CTA ──────────────────── */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}>
        <TouchableOpacity
          style={styles.ctaButton}
          activeOpacity={0.85}
          onPress={handleContinue}
        >
          <LinearGradient
            colors={[C.teal600, C.teal400]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaGradient}
          >
            <Text style={styles.ctaText}>Continue to Payment</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* ── Per-Seller Address Selector ────────── */}
      <AddressSelector
        visible={localSelectorVisible}
        onClose={() => {
          setLocalSelectorVisible(false);
          setPickingForSellerId(null);
        }}
        onSelect={handleSelectSellerAddress}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: 'rgba(17, 24, 39, 0.8)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  backBtn: {
    padding: 8,
    borderRadius: 999,
  },
  headerTitle: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: C.teal400,
  },
  secureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  secureText: {
    fontSize: 13,
    fontWeight: '500',
    color: C.slate400,
  },

  // Scroll
  scrollArea: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 24 },

  // Address card
  addressCard: {
    backgroundColor: C.slate900,
    borderRadius: 24,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  addressLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  addressIcon: {
    backgroundColor: C.teal900,
    padding: 12,
    borderRadius: 16,
  },
  addressLabel: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 14,
    fontWeight: '700',
    color: C.slate100,
  },
  addressDetail: {
    fontSize: 12,
    color: C.slate400,
    marginTop: 2,
    maxWidth: 160,
  },
  changeBtn: {
    color: C.teal400,
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },

  // Section title
  sectionTitle: {
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: C.teal300,
    marginBottom: 16,
  },

  // Seller cards
  sellerCard: {
    backgroundColor: C.slate900,
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  sellerCardInner: {
    padding: 24,
  },
  sellerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  sellerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sellerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: C.slate800,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sellerAvatarImg: {
    width: 48,
    height: 48,
    opacity: 0.8,
  },
  sellerName: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 15,
    fontWeight: '700',
    color: C.slate100,
  },
  categoryChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    marginTop: 4,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  editBtn: {
    color: C.teal400,
    fontSize: 12,
    fontWeight: '600',
  },
  sellerDivider: {
    height: 1,
    backgroundColor: C.slate800,
  },
  sellerFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingTop: 16,
    marginTop: 8,
  },
  itemsText: {
    fontSize: 14,
    color: C.slate200,
    fontWeight: '500',
  },
  etaText: {
    fontSize: 12,
    color: C.slate500,
    marginTop: 4,
  },
  subtotalText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 18,
    fontWeight: '700',
    color: C.teal400,
  },

  // Bill summary
  billCard: {
    backgroundColor: 'rgba(17, 24, 39, 0.5)',
    borderRadius: 24,
    padding: 32,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(30, 41, 59, 0.5)',
  },
  billTitle: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 18,
    fontWeight: '700',
    color: C.teal400,
    marginBottom: 16,
  },
  billRows: {
    gap: 12,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  billLabel: {
    fontSize: 14,
    color: C.slate400,
  },
  billValue: {
    fontSize: 14,
    fontWeight: '500',
    color: C.slate200,
  },
  billDivider: {
    height: 1,
    backgroundColor: C.slate800,
    marginTop: 4,
  },
  grandLabel: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 18,
    fontWeight: '700',
    color: C.teal400,
    marginTop: 4,
  },
  grandValue: {
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: C.teal400,
    marginTop: 4,
  },

  // Bottom CTA
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(17, 24, 39, 0.95)',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(30, 41, 59, 0.5)',
  },
  ctaButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  ctaGradient: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  ctaText: {
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  modeContainer: {
    flexDirection: 'row',
    backgroundColor: C.slate900,
    borderRadius: 16,
    padding: 6,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
  },
  modeBtnActive: {
    backgroundColor: C.teal600,
  },
  modeText: {
    fontSize: 13,
    fontWeight: '700',
    color: C.slate400,
  },
  modeTextActive: {
    color: '#0f172a',
  },
  sellerAddressLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(13, 148, 136, 0.05)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(13, 148, 136, 0.1)',
  },
  sellerAddressText: {
    flex: 1,
    fontSize: 12,
    color: C.slate300,
    fontWeight: '500',
  },
  perSellerAddressSection: {
    marginTop: 8,
    marginBottom: 8,
  },
  selectedSellerAddressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(13, 148, 136, 0.2)',
  },
  selectedAddressIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(13, 148, 136, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  selectedAddressInfo: {
    flex: 1,
  },
  selectedAddressLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: C.slate100,
    marginBottom: 2,
  },
  selectedAddressFull: {
    fontSize: 11,
    color: C.slate400,
  },
  sellerChangeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  sellerChangeText: {
    fontSize: 10,
    fontWeight: '700',
    color: C.teal400,
    textTransform: 'uppercase',
  },
});
