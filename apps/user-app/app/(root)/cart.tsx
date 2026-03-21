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
import { useThemeColors, useThemedStyles } from '@/theme';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { useMultiCartStore } from '@/store/multiCartStore';
import { MultiCartView } from '@/components/MultiCartView';
import { useAddressStore } from '@/store/address.store';
import { useCheckoutStore } from '@/store/checkout.store';

export default function CartScreen() {
  const colors = useThemeColors();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Multi-cart store hooks
  const carts = useMultiCartStore((s) => s.carts);
  const rawSelected = useMultiCartStore((s) => s.selectedForCheckout);
  const selectedForCheckout = rawSelected instanceof Set ? rawSelected : new Set<string>();

  const cartCount = useMemo(() => Object.keys(carts).length, [carts]);

  if (cartCount === 0) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerIcon}>
            <MaterialIcons name="arrow-back" size={26} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Your Cart</Text>
          <View style={{ width: 44 }} />
        </View>

        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <MaterialIcons name="shopping-basket" size={64} color={colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>Empty Cart</Text>
          <Text style={styles.emptyDesc}>Looks like you haven't added anything yet. Explore our marketplace for amazing finds!</Text>
          <TouchableOpacity
            style={styles.continueshoppingBtn}
            onPress={() => router.push('/(tabs)/home')}
          >
            <Text style={styles.continueshoppingBtnText}>Start Shopping</Text>
            <MaterialIcons name="arrow-forward" size={18} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerIcon}>
          <MaterialIcons name="arrow-back" size={26} color="#ffffff" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Your Cart</Text>
          <Text style={styles.headerSubtitle}>{cartCount} {cartCount === 1 ? 'Seller' : 'Sellers'}</Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        style={styles.scrollview}
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
      >
        <View style={styles.content}>
          <MultiCartView />
        </View>
      </ScrollView>

      {/* Checkout Footer */}
      {selectedForCheckout.size > 0 && (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 24) }]}>
          <View style={styles.footerContent}>
            <View style={styles.selectionInfo}>
              <Text style={styles.selectionLabel}>Selected Sellers</Text>
              <Text style={styles.selectionCount}>{selectedForCheckout.size}</Text>
            </View>
            
            <TouchableOpacity
              style={styles.checkoutBtn}
              activeOpacity={0.8}
              onPress={() => {
                const allCarts = useMultiCartStore.getState().carts;
                const selectedSellers = Array.from(selectedForCheckout).map(id => allCarts[id]);
                
                const checkoutStore = useCheckoutStore.getState();
                const currentAddr = useAddressStore.getState().selectedAddress;
                
                checkoutStore.reset();
                checkoutStore.initFromCarts(selectedSellers, currentAddr ? {
                  label: currentAddr.label || 'Home',
                  fullAddress: currentAddr.fullAddress,
                  lat: currentAddr.lat,
                  lng: currentAddr.lng
                } : null);
                
                router.push('/(root)/checkout');
              }}
            >
              <Text style={styles.checkoutBtnText}>Proceed to Checkout</Text>
              <View style={styles.checkoutIcon}>
                <MaterialIcons name="chevron-right" size={24} color="#ffffff" />
              </View>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#000000',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.lg,
      backgroundColor: '#000000',
    },
    headerIcon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '800',
      color: colors.primary,
      textAlign: 'center',
      letterSpacing: -0.5,
    },
    headerSubtitle: {
      fontSize: 12,
      color: '#999999',
      textAlign: 'center',
      fontWeight: '600',
      marginTop: 2,
    },
    scrollview: {
      flex: 1,
    },
    content: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 40,
    },
    emptyIconContainer: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: 'rgba(13, 148, 136, 0.1)',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 32,
    },
    emptyTitle: {
      fontSize: 24,
      fontWeight: '800',
      color: '#ffffff',
      marginBottom: 12,
    },
    emptyDesc: {
      fontSize: 15,
      lineHeight: 22,
      color: '#999999',
      textAlign: 'center',
      marginBottom: 40,
    },
    continueshoppingBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primary,
      borderRadius: 16,
      paddingHorizontal: 28,
      paddingVertical: 18,
      gap: 10,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.3,
      shadowRadius: 20,
      elevation: 8,
    },
    continueshoppingBtnText: {
      color: '#ffffff',
      fontWeight: '800',
      fontSize: 16,
    },
    footer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      paddingHorizontal: 20,
      paddingTop: 20,
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      borderTopWidth: 1,
      borderTopColor: 'rgba(255, 255, 255, 0.05)',
    },
    footerContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
    selectionInfo: {
      flex: 0.4,
    },
    selectionLabel: {
      fontSize: 11,
      color: '#999999',
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 4,
    },
    selectionCount: {
      fontSize: 24,
      fontWeight: '800',
      color: colors.primary,
    },
    checkoutBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.primary,
      borderRadius: 20,
      paddingLeft: 24,
      paddingRight: 10,
      height: 64,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.3,
      shadowRadius: 20,
      elevation: 8,
    },
    checkoutBtnText: {
      color: '#ffffff',
      fontWeight: '800',
      fontSize: 16,
    },
    checkoutIcon: {
      width: 44,
      height: 44,
      borderRadius: 16,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      justifyContent: 'center',
      alignItems: 'center',
    },
  });
