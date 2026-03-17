/**
 * StickyCartBar Component
 * 
 * Shows seller's active cart at the bottom of seller detail screens
 * - Item count + total price
 * - "View Cart" button opens CartModal
 * - Silently fetches delivery quotes for caching
 * - Only visible if cart has items for this seller
 */

import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  View,
  Text,
  Animated,
} from 'react-native';
import { useMultiCartStore } from '@/store/multiCartStore';
import { MaterialIcons } from '@expo/vector-icons';
import { CartModal } from './CartModal';
import { locationService } from '@/services/location.service';
import { deliveryQuotesCacheService } from '@/services/deliveryQuotesCache.service';

interface StickyCartBarProps {
  sellerId: string;
  sellerName: string;
  sellerLat?: number;
  sellerLng?: number;
  onCheckout?: (sellerId: string) => void;
}

export const StickyCartBar: React.FC<StickyCartBarProps> = ({
  sellerId,
  sellerName,
  sellerLat,
  sellerLng,
  onCheckout,
}) => {
  const [cartModalVisible, setCartModalVisible] = useState(false);

  // Silently fetch delivery quotes when component mounts
  useEffect(() => {
    const silentlyFetchDeliveryQuotes = async () => {
      try {
        const userLocation = locationService.getUserLocation();

        // Only fetch if we have both user location and seller location
        if (userLocation && sellerLat && sellerLng) {
          // This call happens silently - it returns mock data immediately
          // and fetches real data in the background, storing in cache
          await deliveryQuotesCacheService.getDeliveryQuotes(
            sellerId,
            sellerLat,
            sellerLng,
            userLocation.latitude,
            userLocation.longitude,
            userLocation.address,
          );
          console.log(`✓ Silently fetched delivery quotes for ${sellerName}`);
        } else if (!userLocation) {
          console.log('User location not available, skipping delivery quotes fetch');
        }
      } catch (error) {
        console.warn('Error silently fetching delivery quotes:', error);
        // Silently fail - user will still see cached/mock data
      }
    };

    silentlyFetchDeliveryQuotes();
  }, [sellerId, sellerName, sellerLat, sellerLng]);
  
  // Subscribe to this seller's cart directly
  const cart = useMultiCartStore((state) => state.carts[sellerId]);
  
  // Compute values from cart
  const cartCount = cart ? cart.items.reduce((sum, item) => sum + item.quantity, 0) : 0;
  const cartTotal = cart
    ? cart.items.reduce((sum, item) => {
        const itemTotal = item.totalPrice
          ? item.totalPrice * item.quantity
          : item.price * item.quantity;
        return sum + itemTotal;
      }, 0)
    : 0;

  // Only show if this seller has items in cart
  if (cartCount === 0) return null;

  const handleViewCart = () => {
    setCartModalVisible(true);
  };

  const handleCheckout = (sellerIdToCheckout: string) => {
    setCartModalVisible(false);
    if (onCheckout) {
      onCheckout(sellerIdToCheckout);
    }
  };

  return (
    <>
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

      {/* Cart Modal */}
      <CartModal
        visible={cartModalVisible}
        sellerId={sellerId}
        sellerName={sellerName}
        onClose={() => setCartModalVisible(false)}
        onCheckout={handleCheckout}
      />
    </>
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
