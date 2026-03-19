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

import React, { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Image,
  StyleSheet,
  TouchableOpacity,
  View,
  Text,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useMultiCartStore } from '@/store/multiCartStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors, useThemedStyles } from '@/theme';

interface StickyMultiCartBarProps {
  tabBarHeight?: number;
}

export const StickyMultiCartBar: React.FC<StickyMultiCartBarProps> = ({
  tabBarHeight = 92,
}) => {
  const colors = useThemeColors();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const carts = useMultiCartStore((state) => state.carts);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(8)).current;

  // Calculate totals from all carts
  const { totalItems, activeSellerName, activeSellerCount, previewImage } = useMemo(() => {
    let items = 0;
    let sellerName = "Baker's";
    let sellerCount = 0;
    let sellerLogo: string | undefined;
    let firstFound = false;

    Object.entries(carts).forEach(([_, cart]) => {
      if (cart.items.length > 0) {
        sellerCount += 1;

        if (!firstFound) {
          sellerName = cart.sellerName || "Baker's";
          sellerLogo = cart.sellerLogo;
          firstFound = true;
        }

        cart.items.forEach((item) => {
          items += item.quantity;
        });
      }
    });

    return {
      totalItems: items,
      activeSellerName: sellerName,
      activeSellerCount: sellerCount,
      previewImage: sellerLogo,
    };
  }, [carts]);

  useEffect(() => {
    if (totalItems === 0) return;
    
    fadeAnim.setValue(0);
    translateY.setValue(8);

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, translateY, totalItems]);

  if (totalItems === 0) return null;

  const handleCheckout = () => {
    router.push('/cart');
  };

  const checkoutLabel =
    activeSellerCount > 1 ? `Checkout from ${activeSellerCount} sellers` : `${activeSellerName}`;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          bottom: tabBarHeight + insets.bottom + 16,
          opacity: fadeAnim,
          transform: [{ translateY }],
        },
      ]}
    >
      <View style={styles.wrapper}>
        <View style={styles.content}>
          <View style={styles.leftCluster}>
            <View style={styles.previewWrap}>
              <Image
                source={{
                  uri: (previewImage && previewImage.trim().length > 0)
                    ? previewImage
                    : 'https://lh3.googleusercontent.com/aida-public/AB6AXuBWcZRELIxzqB10a9Zjn6dZAYPLBsWmzSvKIXXVe1OOpOyzwxV2VVX82tJYE4fmr4AceXMsO2w2D1DWFIF8CQRUcECikFhiHKd8guZ6OKgNjP3WuD0hJNT7oo2Ej5_sZ6FD6HWceY8a2ERo1AOldqc2WtGWB6yiek5ZxKAHwSaM5nAzpVrO12rCnAEO3xbYVYNVZ_NCWog0iNrHRb9NhIL7xE54eMIwx6SHwK7jQwtSvQJAy3GaQhBvYCrr6Geqj6QFv1s285HuPjMq',
                }}
                style={styles.previewImage}
              />
            </View>
            <View>
              <Text style={styles.label}>{checkoutLabel}</Text>
              <Text style={styles.details}>
                {totalItems} item{totalItems !== 1 ? 's' : ''} ready
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.checkoutButton}
            onPress={handleCheckout}
            activeOpacity={0.7}
          >
            <Text style={styles.checkoutButtonText}>Go to Cart</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    position: 'absolute',
    left: 20,
    right: 20,
    zIndex: 70,
  },
  wrapper: {
    backgroundColor: colors.primary, // Using primary for high impact as per design North Star
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 10,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftCluster: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingLeft: 8,
  },
  previewWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.3,
  },
  details: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 1,
  },
  checkoutButton: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  checkoutButtonText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
});
