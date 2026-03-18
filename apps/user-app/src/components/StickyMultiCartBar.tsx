/**
 * StickyMultiCartBar Component
 * 
 * Sticky cart bar for home page showing summary of all active carts
 * - Shows total items across all sellers
 * - Shows combined price from all sellers
 * - Shows number of active sellers
 * - Button to proceed to combined checkout
 * - Only visible if cart has items from any seller
 */

import React, { useMemo } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  View,
  Text,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useMultiCartStore } from '@/store/multiCartStore';
import { MaterialIcons } from '@expo/vector-icons';

interface StickyMultiCartBarProps {
  tabBarHeight?: number;
}

export const StickyMultiCartBar: React.FC<StickyMultiCartBarProps> = ({
  tabBarHeight = 60,
}) => {
  const router = useRouter();
  const carts = useMultiCartStore((state) => state.carts);

  // Calculate totals from all carts
  const { totalItems, totalPrice, activeSellers } = useMemo(() => {
    let items = 0;
    let price = 0;
    let sellers = 0;

    Object.entries(carts).forEach(([_, cart]) => {
      if (cart.items.length > 0) {
        sellers += 1;
        cart.items.forEach((item) => {
          items += item.quantity;
          const itemTotal = item.totalPrice
            ? item.totalPrice * item.quantity
            : item.price * item.quantity;
          price += itemTotal;
        });
      }
    });

    return { totalItems: items, totalPrice: price, activeSellers: sellers };
  }, [carts]);

  // Only show if there are items
  if (totalItems === 0) return null;

  const handleCheckout = () => {
    // TODO: Multi-cart checkout disabled for now - using single cart only
    // Intelligent routing: decide which checkout flow to use
    // if (activeSellers === 1) {
    //   // Single seller - use regular checkout flow
    //   router.push('/checkout');
    // } else if (activeSellers > 1) {
    //   // Multiple sellers - use combined/multi-cart checkout
    //   router.push('/checkout-multi');
    // }

    // For now: Always use single checkout (single seller only)
    router.push('/checkout');
  };

  return (
    <View style={[styles.container, { bottom: tabBarHeight }]}>
      <View style={styles.content}>
        <View style={styles.infoSection}>
          <Text style={styles.label}>
            {activeSellers > 1
              ? `${activeSellers} Sellers`
              : activeSellers === 1
              ? '1 Seller'
              : 'Cart'}
          </Text>
          <Text style={styles.details}>
            {totalItems} item{totalItems !== 1 ? 's' : ''} • ₹{totalPrice.toFixed(2)}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.checkoutButton}
          onPress={handleCheckout}
          activeOpacity={0.7}
        >
          <Text style={styles.checkoutButtonText}>Checkout</Text>
          <MaterialIcons name="arrow-forward" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    position: 'absolute',
    left: 0,
    right: 0,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoSection: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  details: {
    fontSize: 12,
    color: '#666',
  },
  checkoutButton: {
    backgroundColor: '#e74c3c',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  checkoutButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
