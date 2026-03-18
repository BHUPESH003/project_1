/**
 * Multi-Cart Screen – Display all active seller carts with checkout options
 * Integrated with Zustand multi-cart store
 * Supports both single and multi-seller checkouts
 */

import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useThemeColors, useThemedStyles } from '@/theme';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { useMultiCartStore } from '@/store/multiCartStore';
import { MultiCartView } from '@/components/MultiCartView';
import { CombinedCheckoutFlow } from '@/components/CombinedCheckoutFlow';
import { usersApi } from '@/api/users.api';
import { useLocationStore } from '@/store/location.store';

export default function CartScreen() {
  const colors = useThemeColors();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  // Multi-cart store hooks
  const carts = useMultiCartStore((s) => s.carts);
  const selectedForCheckout = useMultiCartStore((s) => s.selectedForCheckout);
  
  const [viewMode, setViewMode] = useState<'carts' | 'checkout'>('carts');
  const [addressMode, setAddressMode] = useState<'same' | 'different'>('same');
  const [proceededToCheckout, setProceededToCheckout] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState<{
    latitude: number;
    longitude: number;
    address: string;
  } | null>(null);
  const [perSellerAddresses, setPerSellerAddresses] = useState<Record<string, {
    latitude: number;
    longitude: number;
    address: string;
  }>>({});

  const { data: addresses = [] } = useQuery({
    queryKey: ['user-addresses'],
    queryFn: () => usersApi.getMyAddresses(),
    enabled: viewMode === 'checkout',
  });
  const locationCoords = useLocationStore((s) => s.coords);

  // Get cart count
  const cartCount = useMemo(() => Object.keys(carts).length, [carts]);

  if (cartCount === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top / 2 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Your Cart</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.emptyContainer}>
          <MaterialIcons name="shopping-cart" size={64} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptyDesc}>Start shopping to add items to your cart</Text>
          <TouchableOpacity
            style={styles.continueshoppingBtn}
            onPress={() => router.push('/(tabs)/home')}
          >
            <Text style={styles.continueshoppingBtnText}>Continue Shopping</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (viewMode === 'carts') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            Your Cart ({cartCount} {cartCount === 1 ? 'seller' : 'sellers'})
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollview}>
          <MultiCartView />
          <View style={{ height: spacing.xl * 2 }} />
        </ScrollView>

        {selectedForCheckout.size > 0 && (
          <View style={[styles.checkoutFooter, { paddingBottom: insets.bottom + spacing.md }]}>
            <TouchableOpacity
              style={styles.checkoutBtn}
              onPress={() => setViewMode('checkout')}
            >
              <Text style={styles.checkoutBtnText}>
                Checkout ({selectedForCheckout.size})
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    );
  }

  // Checkout flow
  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity
          onPress={() => {
            setViewMode('carts');
            setProceededToCheckout(false);
            setDeliveryAddress(null);
            setPerSellerAddresses({});
          }}
          style={styles.backBtn}
        >
          <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollview}>
        {!proceededToCheckout && !deliveryAddress && addressMode === 'same' ? (
          <View style={styles.addressSection}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Delivery Address
            </Text>
            {selectedForCheckout.size > 1 && (
              <View style={[styles.addressModeRow, { marginBottom: spacing.md }]}>
                <TouchableOpacity
                  style={[styles.addressModeBtn, addressMode === 'same' && styles.addressModeBtnActive]}
                  onPress={() => setAddressMode('same')}
                >
                  <Text style={[styles.addressModeText, addressMode === 'same' && styles.addressModeTextActive]}>
                    Same address for all
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.addressModeBtn, addressMode !== 'same' && styles.addressModeBtnActive]}
                  onPress={() => setAddressMode('different')}
                >
                  <Text style={[styles.addressModeText, addressMode !== 'same' && styles.addressModeTextActive]}>
                    Different address per seller
                  </Text>
                </TouchableOpacity>
              </View>
            )}
            {addresses.length > 0 ? (
              addresses.map((addr) => (
                <TouchableOpacity
                  key={addr.id}
                  style={[styles.addressOption, { borderColor: colors.border }]}
                  onPress={() => {
                    if (addr.latitude != null && addr.longitude != null) {
                      setDeliveryAddress({
                        latitude: addr.latitude,
                        longitude: addr.longitude,
                        address: addr.addressLine,
                      });
                      setProceededToCheckout(true);
                    }
                  }}
                >
                  <Text style={[styles.addressLabel, { color: colors.textPrimary }]}>
                    {addr.label}
                  </Text>
                  <Text style={[styles.addressText, { color: colors.textSecondary }]}>
                    {addr.addressLine}
                  </Text>
                </TouchableOpacity>
              ))
            ) : null}
            <TouchableOpacity
              style={[styles.continueshoppingBtn, { marginTop: spacing.md }]}
              onPress={() => {
                const lat = locationCoords?.latitude ?? 28.7041;
                const lng = locationCoords?.longitude ?? 77.1025;
                setDeliveryAddress({
                  latitude: lat,
                  longitude: lng,
                  address: locationCoords?.label ?? 'Current location',
                });
                setProceededToCheckout(true);
              }}
            >
              <Text style={styles.continueshoppingBtnText}>
                {addresses.length > 0 ? 'Use current location' : 'Select Address'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : !proceededToCheckout && addressMode === 'different' && selectedForCheckout.size > 1 ? (
          <View style={styles.addressSection}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Address per seller
            </Text>
            <View style={[styles.addressModeRow, { marginBottom: spacing.md }]}>
              <TouchableOpacity
                style={[styles.addressModeBtn, addressMode === 'same' && styles.addressModeBtnActive]}
                onPress={() => { setAddressMode('same'); setDeliveryAddress(null); setPerSellerAddresses({}); setProceededToCheckout(false); }}
              >
                <Text style={[styles.addressModeText, addressMode === 'same' && styles.addressModeTextActive]}>
                  Same for all
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.addressModeBtn, addressMode !== 'same' && styles.addressModeBtnActive]}
                onPress={() => setAddressMode('different')}
              >
                <Text style={[styles.addressModeText, addressMode !== 'same' && styles.addressModeTextActive]}>
                  Different per seller
                </Text>
              </TouchableOpacity>
            </View>
            {Array.from(selectedForCheckout).map((sellerId) => {
              const cart = carts[sellerId];
              const addr = perSellerAddresses[sellerId];
              return (
                <View key={sellerId} style={[styles.perSellerBlock, { borderColor: colors.border }]}>
                  <Text style={[styles.perSellerLabel, { color: colors.textPrimary }]}>
                    {cart?.sellerName ?? sellerId}
                  </Text>
                  {addresses.map((a) => (
                    <TouchableOpacity
                      key={a.id}
                      style={[styles.addressOption, { borderColor: colors.border }]}
                      onPress={() => {
                        if (a.latitude != null && a.longitude != null) {
                          const addr = { latitude: a.latitude, longitude: a.longitude, address: a.addressLine };
                          setPerSellerAddresses((prev) => ({ ...prev, [sellerId]: addr }));
                        }
                      }}
                    >
                      <Text style={[styles.addressLabel, { color: colors.textPrimary }]}>{a.label}</Text>
                      <Text style={[styles.addressText, { color: colors.textSecondary }]}>{a.addressLine}</Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity
                    style={[styles.continueshoppingBtn, { marginTop: spacing.sm }]}
                    onPress={() => {
                      const lat = locationCoords?.latitude ?? 28.7041;
                      const lng = locationCoords?.longitude ?? 77.1025;
                      const addr: { latitude: number; longitude: number; address: string } = {
                        latitude: lat,
                        longitude: lng,
                        address: locationCoords?.label ?? 'Current location',
                      };
                      setPerSellerAddresses((prev) => ({ ...prev, [sellerId]: addr }));
                    }}
                  >
                    <Text style={styles.continueshoppingBtnText}>Use current location</Text>
                  </TouchableOpacity>
                  {addr && <Text style={[styles.selectedAddrHint, { color: colors.textMuted }]}>✓ Selected</Text>}
                </View>
              );
            })}
            {Object.keys(perSellerAddresses).length === selectedForCheckout.size && (
              <TouchableOpacity
                style={[styles.continueshoppingBtn, { marginTop: spacing.lg }]}
                onPress={() => {
                  const first = Object.values(perSellerAddresses)[0];
                  if (first) {
                    setDeliveryAddress(first);
                    setProceededToCheckout(true);
                  }
                }}
              >
                <Text style={styles.continueshoppingBtnText}>Proceed to Checkout</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <CombinedCheckoutFlow
            deliveryAddress={deliveryAddress!}
            deliveryAddresses={Object.keys(perSellerAddresses).length > 0 ? perSellerAddresses : undefined}
            onSuccess={() => {
              setViewMode('carts');
              setDeliveryAddress(null);
              setPerSellerAddresses({});
              setProceededToCheckout(false);
            }}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backBtn: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: {
      ...typography.screenTitle,
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.textPrimary,
    },
    scrollview: {
      flex: 1,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
    },
    emptyTitle: {
      ...typography.sectionHeader,
      fontSize: 18,
      fontWeight: '600',
      color: colors.textPrimary,
      marginTop: spacing.lg,
    },
    emptyDesc: {
      ...typography.primary,
      color: colors.textMuted,
      marginTop: spacing.sm,
      textAlign: 'center',
    },
    continueshoppingBtn: {
      backgroundColor: colors.primary,
      borderRadius: 10,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      marginTop: spacing.lg,
    },
    continueshoppingBtnText: {
      color: colors.textOnPrimary,
      fontWeight: '600',
      fontSize: 15,
      textAlign: 'center',
    },
    checkoutFooter: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
      backgroundColor: colors.surface,
    },
    checkoutBtn: {
      backgroundColor: colors.primary,
      borderRadius: 10,
      paddingVertical: spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 50,
    },
    checkoutBtnText: {
      color: colors.textOnPrimary,
      fontWeight: '600',
      fontSize: 16,
    },
    disabledContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
    },
    addressSection: {
      padding: spacing.lg,
    },
    sectionTitle: {
      ...typography.sectionHeader,
      marginBottom: spacing.md,
    },
    addressOption: {
      borderWidth: 1,
      borderRadius: 10,
      padding: spacing.md,
      marginBottom: spacing.sm,
    },
    addressModeRow: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    addressModeBtn: {
      flex: 1,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
    },
    addressModeBtnActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    addressModeText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    addressModeTextActive: {
      color: colors.textLight,
    },
    perSellerBlock: {
      borderWidth: 1,
      borderRadius: 10,
      padding: spacing.md,
      marginBottom: spacing.lg,
    },
    perSellerLabel: {
      fontSize: 14,
      fontWeight: '700',
      marginBottom: spacing.sm,
    },
    selectedAddrHint: {
      fontSize: 12,
      marginTop: spacing.xs,
    },
    addressLabel: {
      fontWeight: '600',
      marginBottom: 4,
    },
    addressText: {
      fontSize: 14,
    },
  });
