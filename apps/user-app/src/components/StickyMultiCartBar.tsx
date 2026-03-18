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
    // MVP: Route to multi-cart view which handles both single and multi-seller checkout
    router.push('/cart');
  };

  return (
    <View style={[styles.container, { bottom: tabBarHeight + 6 }]}>
      <View style={styles.wrapper}>
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: 12,
    paddingVertical: 0,
  },
  wrapper: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
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
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#e74c3c',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  checkoutButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
