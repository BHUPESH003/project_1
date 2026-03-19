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
import { AddressSelector } from '@/components/AddressSelector';

export default function CartScreen() {
  const colors = useThemeColors();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Multi-cart store hooks
  const carts = useMultiCartStore((s) => s.carts);
  const rawSelected = useMultiCartStore((s) => s.selectedForCheckout);
  const selectedForCheckout = rawSelected instanceof Set ? rawSelected : new Set<string>();

  const [viewMode, setViewMode] = useState<'carts' | 'checkout'>('carts');
  const [addressMode, setAddressMode] = useState<'same' | 'different'>('same');
  const [proceededToCheckout, setProceededToCheckout] = useState(false);
  
  // Track which seller we are currently selecting address for (if mode is 'different')
  const [activeSellerSelection, setActiveSellerSelection] = useState<string | null>(null);

  const [deliveryAddress, setDeliveryAddress] = useState<{
    latitude: number;
    longitude: number;
    address: string;
    label?: string;
  } | null>(null);
  
  const [perSellerAddresses, setPerSellerAddresses] = useState<Record<string, {
    latitude: number;
    longitude: number;
    address: string;
    label?: string;
  }>>({});

  const cartCount = useMemo(() => Object.keys(carts).length, [carts]);

  const handleAddressSelect = (addr: { latitude: number; longitude: number; address: string; label?: string }) => {
    if (addressMode === 'same' || selectedForCheckout.size === 1) {
      setDeliveryAddress(addr);
      setProceededToCheckout(true);
    } else if (activeSellerSelection) {
      setPerSellerAddresses(prev => ({ ...prev, [activeSellerSelection]: addr }));
      setActiveSellerSelection(null); // Return to list
    }
  };

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
      {!proceededToCheckout && !activeSellerSelection && (
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
          <Text style={styles.headerTitle}>Select Location</Text>
          <View style={{ width: 40 }} />
        </View>
      )}

      {proceededToCheckout ? (
        <ScrollView style={styles.scrollview}>
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
        </ScrollView>
      ) : activeSellerSelection ? (
        <AddressSelector 
          onSelect={handleAddressSelect}
          onClose={() => setActiveSellerSelection(null)}
        />
      ) : (addressMode === 'same' || selectedForCheckout.size === 1) ? (
        <View style={{ flex: 1 }}>
          {selectedForCheckout.size > 1 && (
            <View style={[styles.addressModeRow, { padding: spacing.md, backgroundColor: colors.surface }]}>
              <TouchableOpacity
                style={[styles.addressModeBtn, addressMode === 'same' && styles.addressModeBtnActive]}
                onPress={() => setAddressMode('same')}
              >
                <Text style={[styles.addressModeText, addressMode === 'same' && styles.addressModeTextActive]}>
                  Same address
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.addressModeBtn, addressMode === 'different' && styles.addressModeBtnActive]}
                onPress={() => setAddressMode('different')}
              >
                <Text style={[styles.addressModeText, addressMode === 'different' && styles.addressModeTextActive]}>
                  Different address
                </Text>
              </TouchableOpacity>
            </View>
          )}
          <AddressSelector 
            onSelect={handleAddressSelect}
            onClose={() => setViewMode('carts')}
          />
        </View>
      ) : (
        <ScrollView style={styles.scrollview}>
          <View style={styles.addressSection}>
            <View style={[styles.addressModeRow, { marginBottom: spacing.lg }]}>
              <TouchableOpacity
                style={[styles.addressModeBtn, (addressMode as string) === 'same' && styles.addressModeBtnActive]}
                onPress={() => { setAddressMode('same'); setDeliveryAddress(null); setPerSellerAddresses({}); }}
              >
                <Text style={[styles.addressModeText, (addressMode as string) === 'same' && styles.addressModeTextActive]}>
                  Same for all
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.addressModeBtn, (addressMode as string) === 'different' && styles.addressModeBtnActive]}
                onPress={() => setAddressMode('different')}
              >
                <Text style={[styles.addressModeText, (addressMode as string) === 'different' && styles.addressModeTextActive]}>
                  Different per seller
                </Text>
              </TouchableOpacity>
            </View>

            {Array.from(selectedForCheckout).map((sellerId) => {
              const cart = carts[sellerId];
              const addr = perSellerAddresses[sellerId];
              return (
                <TouchableOpacity 
                  key={sellerId} 
                  style={[styles.perSellerBlock, { borderColor: addr ? colors.primary : colors.border }]}
                  onPress={() => setActiveSellerSelection(sellerId)}
                >
                  <View style={styles.perSellerHeader}>
                    <Text style={[styles.perSellerLabel, { color: colors.textPrimary }]}>
                      {cart?.sellerName ?? sellerId}
                    </Text>
                    <MaterialIcons 
                      name={addr ? "check-circle" : "add-location"} 
                      size={20} 
                      color={addr ? colors.primary : colors.textMuted} 
                    />
                  </View>
                  {addr ? (
                    <Text style={[styles.addressText, { color: colors.textSecondary }]} numberOfLines={1}>
                      {addr.address}
                    </Text>
                  ) : (
                    <Text style={[styles.addressText, { color: colors.textMuted }]}>
                      Tap to select delivery address
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}

            {Object.keys(perSellerAddresses).length === selectedForCheckout.size && (
              <TouchableOpacity
                style={styles.continueshoppingBtn}
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
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const createStyles = (colors: import('@/theme/types').ThemeColors) =>
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
      color: colors.textLight,
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
      color: colors.textLight,
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
      backgroundColor: '#000000',
      padding: spacing.sm,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#333333',
    },
    addressModeBtn: {
      flex: 1,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      borderRadius: 8,
      alignItems: 'center',
    },
    addressModeBtnActive: {
      backgroundColor: colors.primary,
    },
    addressModeText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#999999',
    },
    addressModeTextActive: {
      color: '#ffffff',
    },
    perSellerBlock: {
      borderWidth: 1,
      borderRadius: 10,
      padding: spacing.md,
      marginBottom: spacing.lg,
    },
    perSellerHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.xs,
    },
    perSellerLabel: {
      fontSize: 14,
      fontWeight: '700',
    },
    addressLabel: {
      fontWeight: '600',
      marginBottom: 4,
    },
    addressText: {
      fontSize: 14,
    },
  });
