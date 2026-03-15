/**
 * StickyCartBar Component
 * 
 * Shows seller's active cart at the bottom of seller detail screens
 * - Item count + total price
 * - "View Cart" button to navigate to cart
 * - Only visible if cart has items for this seller
 */

import React from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  View,
  Text,
  Animated,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useMultiCartStore } from '@/store/multiCartStore';
import { MaterialIcons } from '@expo/vector-icons';

interface StickyCartBarProps {
  sellerId: string;
  sellerName: string;
}

export const StickyCartBar: React.FC<StickyCartBarProps> = ({
  sellerId,
  sellerName,
}) => {
  const navigation = useNavigation<any>();
  const cartCount = useMultiCartStore((state) =>
    state.getCartCount(sellerId)
  );
  const cartTotal = useMultiCartStore((state) =>
    state.getCartTotal(sellerId)
  );

  // Only show if this seller has items in cart
  if (cartCount === 0) return null;

  const handleViewCart = () => {
    // Navigate to CartScreen with this seller's ID
    navigation.navigate('Cart', { sellerId });
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.infoSection}>
          <Text style={styles.label}>{sellerName}</Text>
          <Text style={styles.details}>
            {cartCount} item{cartCount !== 1 ? 's' : ''} • ₹{cartTotal.toFixed(2)}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.viewCartButton}
          onPress={handleViewCart}
          activeOpacity={0.7}
        >
          <Text style={styles.viewCartText}>View Cart</Text>
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
    bottom: 0,
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
    color: '#333',
    marginBottom: 4,
  },
  details: {
    fontSize: 12,
    color: '#666',
  },
  viewCartButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  viewCartText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
});
