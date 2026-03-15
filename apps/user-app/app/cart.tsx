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
import { CombinedCheckoutFlow } from '@/components/CombinedCheckoutFlow';
import { Loader } from '@/components/Loader';

export default function CartScreen() {
  const colors = useThemeColors();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  // Multi-cart store hooks
  const carts = useMultiCartStore((s) => s.carts);
  const selectedForCheckout = useMultiCartStore((s) => s.selectedForCheckout);
  
  const [viewMode, setViewMode] = useState<'carts' | 'checkout'>('carts');

  // Get cart count
  const cartCount = useMemo(() => Object.keys(carts).length, [carts]);

  if (cartCount === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top }]}>
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
          onPress={() => setViewMode('carts')}
          style={styles.backBtn}
        >
          <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollview}>
        <CombinedCheckoutFlow />
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
  });
