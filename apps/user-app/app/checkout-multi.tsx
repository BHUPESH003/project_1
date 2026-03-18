/**
 * Multi-Seller Combined Checkout Screen
 * 
 * ⚠️ CURRENTLY DISABLED - Not in use
 * Using single-cart checkout only for now
 * 
 * Handles checkout for items from multiple sellers:
 * - Displays all shops with their items and delivery partners
 * - Each shop has separate delivery and payment calculation
 * - Combined payment at the end for all shops
 * 
 * Routes here when cart has items from 2+ sellers (DISABLED)
 */

import React, { useState } from 'react';
import { View, SafeAreaView, StyleSheet, ActivityIndicator, Text, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useMultiCartStore } from '@/store/multiCartStore';
import { useLocation } from '@/hooks/useLocation';
import { useThemeColors } from '@/theme';
import { CombinedCheckoutFlow } from '@/components/CombinedCheckoutFlow';

export default function MultiCheckoutScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const { coords: deviceLocation } = useLocation();
  const [isReady, setIsReady] = useState(false);

  // Get saved delivery address or use device location
  const sharedDeliveryAddress = useMultiCartStore((state) => state.sharedDeliveryAddress);
  
  const deliveryAddress = React.useMemo((): { latitude: number; longitude: number; address: string } | null => {
    if (sharedDeliveryAddress) {
      return {
        latitude: sharedDeliveryAddress.lat,
        longitude: sharedDeliveryAddress.lng,
        address: sharedDeliveryAddress.address,
      };
    }

    if (deviceLocation) {
      return {
        latitude: deviceLocation.latitude,
        longitude: deviceLocation.longitude,
        address: 'Current Location',
      };
    }

    return null;
  }, [sharedDeliveryAddress, deviceLocation]);

  // Check if we have active carts
  const carts = useMultiCartStore((state) => state.carts);
  const activeCarts = Object.values(carts).filter((cart) => cart.items.length > 0);

  React.useEffect(() => {
    // If somehow there's only 1 or 0 sellers, redirect to appropriate screen
    if (activeCarts.length === 0) {
      Alert.alert('Empty Cart', 'Your cart is empty. Please add items before checkout.');
      router.back();
      return;
    }

    if (activeCarts.length === 1) {
      // Redirect to single checkout if only 1 seller remains
      Alert.alert('Note', 'Single seller detected. Redirecting to checkout...');
      router.push('/cart');
      return;
    }

    setIsReady(true);
  }, [activeCarts, router]);

  if (!isReady) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.backgroundDark }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textPrimary }]}>
            Preparing checkout...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!deliveryAddress) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.backgroundDark }]}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.error }]}>
            Location required for delivery
          </Text>
          <Text style={[styles.errorSubtext, { color: colors.textMuted }]}>
            Please enable location permissions or set delivery address
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.backgroundDark }]}>
      <CombinedCheckoutFlow
        deliveryAddress={deliveryAddress}
        onSuccess={() => {
          // Clear all carts after successful checkout
          useMultiCartStore.getState().clearAllCarts();
          router.push('/orders');
        }}
        onError={(error) => {
          Alert.alert('Checkout Error', error || 'An error occurred during checkout');
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
});
