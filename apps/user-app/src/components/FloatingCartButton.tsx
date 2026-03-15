/**
 * FloatingCartButton Component
 *
 * Floating action button (FAB) shown on HomeScreen/DashboardScreen
 * - Appears only when user has active carts (items from sellers)
 * - Badge shows total number of active carts (not items)
 * - If only 1 cart, badge shows item count instead
 * - Tap to navigate to multi-cart view
 * - Position: bottom-right above tab bar
 */

import React, { useEffect } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  View,
  Text,
  Animated,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useMultiCartStore } from '@/store/multiCartStore';
import { MaterialIcons } from '@expo/vector-icons';

interface FloatingCartButtonProps {
  tabBarHeight?: number;
}

export const FloatingCartButton: React.FC<FloatingCartButtonProps> = ({
  tabBarHeight = 60,
}) => {
  const navigation = useNavigation<any>();
  const scaleAnim = new Animated.Value(0);

  // Get all carts with items
  const allCarts = useMultiCartStore((state) =>
    state.getAllCartsWithItems()
  );
  const activeCrts = useMultiCartStore((state) => state.getActiveCarts());

  // Calculate badge value
  const getBadgeValue = (): number => {
    if (activeCrts.length === 1) {
      // If only 1 cart, show item count
      return useMultiCartStore((state) =>
        state.getCartCount(activeCrts[0])
      );
    }
    // If multiple carts, show cart count
    return activeCrts.length;
  };

  const badgeValue = getBadgeValue();

  // Animate FAB in/out
  useEffect(() => {
    if (activeCrts.length > 0) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.spring(scaleAnim, {
        toValue: 0,
        useNativeDriver: true,
      }).start();
    }
  }, [activeCrts.length]);

  // Don't render if no carts
  if (activeCrts.length === 0) return null;

  const handlePress = () => {
    // Navigate to CartScreen with sellerId = null (multi-cart view)
    navigation.navigate('Cart', { sellerId: null });
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ scale: scaleAnim }],
          bottom: tabBarHeight + 20,
        },
      ]}
    >
      <TouchableOpacity
        style={styles.fab}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <MaterialIcons name="shopping-cart" size={28} color="#fff" />

        {/* Badge showing count */}
        {badgeValue > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {badgeValue > 99 ? '99+' : badgeValue}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 20,
    zIndex: 999,
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FF1744',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
});
