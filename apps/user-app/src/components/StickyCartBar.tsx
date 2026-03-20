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
import { useAddressStore } from '@/store/address.store';
import { deliveryQuotesCacheService } from '@/services/deliveryQuotesCache.service';
import { useThemeColors, useThemedStyles } from '@/theme';
import { useRouter } from 'expo-router';

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
  const colors = useThemeColors();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const [cartModalVisible, setCartModalVisible] = useState(false);
  const selectedAddress = useAddressStore((s) => s.selectedAddress);

  // Silently fetch delivery quotes when component mounts
  useEffect(() => {
    const silentlyFetchDeliveryQuotes = async () => {
      try {
        // Only fetch if we have both user location and seller location
        if (selectedAddress && sellerLat && sellerLng) {
          // This call happens silently - it returns mock data immediately
          // and fetches real data in the background, storing in cache
          await deliveryQuotesCacheService.getDeliveryQuotes(
            sellerId,
            sellerLat,
            sellerLng,
            selectedAddress.lat,
            selectedAddress.lng,
            selectedAddress.fullAddress,
          );
          console.log(`✓ Silently fetched delivery quotes for ${sellerName}`);
        } else if (!selectedAddress) {
          console.log('User location not available, skipping delivery quotes fetch');
        }
      } catch (error) {
        console.warn('Error silently fetching delivery quotes:', error);
        // Silently fail - user will still see cached/mock data
      }
    };

    silentlyFetchDeliveryQuotes();
  }, [sellerId, sellerName, sellerLat, sellerLng, selectedAddress]);
  
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

  const handleCheckoutAction = (sellerIdToCheckout: string) => {
    setCartModalVisible(false);
    if (onCheckout) {
      onCheckout(sellerIdToCheckout);
    } else {
      router.push('/cart');
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
        onCheckout={handleCheckoutAction}
      />
    </>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderTopWidth: 0, // No-Line rule
    paddingHorizontal: 20,
    paddingVertical: 14,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 10,
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
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  details: {
    fontSize: 12,
    color: colors.textMuted,
  },
  viewCartButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  viewCartText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
});
