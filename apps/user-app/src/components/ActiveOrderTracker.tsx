import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { ordersApi } from '@/api/orders.api';
import { useThemeColors } from '@/theme';
import { spacing } from '@/constants/spacing';
import { radius } from '@/constants/radius';

const ACTIVE_STATUSES = [
  'PAID',
  'SELLER_ACCEPTED',
  'PREPARING',
  'READY_FOR_PICKUP',
  'PICKED_UP',
];

export const ActiveOrderTracker = () => {
  const colors = useThemeColors();
  const router = useRouter();

  // Fetch orders to check for active ones
  const { data: orders } = useQuery({
    queryKey: ['orders'],
    queryFn: () => ordersApi.getMyOrders(),
    refetchInterval: 10000, // Poll every 10 seconds for real-time feel
  });

  const activeOrder = useMemo(() => {
    if (!orders || !Array.isArray(orders)) return null;
    return orders.find((o) => ACTIVE_STATUSES.includes(o.status));
  }, [orders]);

  if (!activeOrder) return null;

  const onTrackPress = () => {
    router.push(`/order/${activeOrder.order_id}`);
  };

  const statusLabel = activeOrder.status.replace(/_/g, ' ');

  return (
    <View style={styles.floatingContainer}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onTrackPress}
        style={[styles.banner, { backgroundColor: '#1a1a1a', borderColor: colors.primaryGlow }]}
      >
        <View style={styles.left}>
          <View style={[styles.iconBox, { backgroundColor: colors.primaryGlow }]}>
            <MaterialIcons
              name={activeOrder.status === 'PICKED_UP' ? 'local-shipping' : 'restaurant'}
              size={24}
              color={colors.primary}
            />
          </View>
          <View style={styles.content}>
            <Text style={[styles.shopName, { color: colors.textPrimary }]} numberOfLines={1}>
              {activeOrder.seller?.shopName || 'Your Order'}
            </Text>
            <View style={styles.statusRow}>
              <View style={[styles.dot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.statusText, { color: colors.primary }]}>
                {statusLabel}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={[styles.trackBtn, { backgroundColor: colors.primary }]} onPress={onTrackPress}>
          <Text style={[styles.trackBtnText, { color: colors.textLight }]}>Track</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
        </TouchableOpacity>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  floatingContainer: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    zIndex: 999,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  shopName: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  trackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  trackBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
