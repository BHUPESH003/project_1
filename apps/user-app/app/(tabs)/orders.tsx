/**
 * My Orders screen – Active and Past orders with tracking
 */
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { MaterialIcons } from '@expo/vector-icons';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Loader } from '@/components/Loader';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { ordersApi, type OrderListItem } from '@/api/orders.api';
import { useOrderDraftStore } from '@/store/order-draft.store';
import { useCartStore } from '@/store/cart.store';

// Demo active order
const DEMO_ACTIVE_ORDER = {
  id: '7721',
  shopName: 'Sunnyside Bakery & Cafe',
  shopImage: 'https://images.unsplash.com/photo-1455619452474-d2be8b1e9f1a?auto=format&fit=crop&w=100&q=80',
  distance: '2.4 km',
  amountToPay: 45.00,
  status: 'on_way',
  timeline: {
    confirmed: { done: true, label: 'Order Confirmed' },
    ready: { done: true, label: 'Ready for Pickup' },
    on_way: { done: true, label: 'Agent on Way' },
    picked_up: { done: true, label: 'Picked Up' },
    delivered: { done: false, label: 'Delivered' },
  },
  driver: {
    name: 'Marcus P.',
    rating: 4.9,
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80',
  },
};

// Demo past orders
const DEMO_PAST_ORDERS = [
  {
    id: '0001',
    shopName: 'FreshMart Groceries',
    shopImage: 'https://images.unsplash.com/photo-1488574432154-8398519cb859?auto=format&fit=crop&w=100&q=80',
    date: '24 Oct',
    itemCount: 12,
    total: 82.10,
    status: 'completed',
  },
  {
    id: '0002',
    shopName: 'The Print Station',
    shopImage: 'https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?auto=format&fit=crop&w=100&q=80',
    date: '18 Oct',
    category: 'Document Printing',
    total: 12.00,
    status: 'completed',
  },
];

function formatDate(iso?: string): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
}

export default function OrdersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const orderId = useOrderDraftStore((s) => s.orderId);
  const selectedShopName = useCartStore((state) => state.selectedShopName);
  const cartItems = useCartStore((state) => state.items);

  // Fetch all orders
  const { data: ordersData, isLoading, isError, error } = useQuery({
    queryKey: ['orders'],
    queryFn: () => ordersApi.getMyOrders(),
  });

  // Fetch active order if orderId exists
  const { data: activeOrderData, isLoading: activeOrderLoading } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => (orderId ? ordersApi.getOrder(orderId) : null),
    enabled: !!orderId,
  });

  // Determine active order - use API data if available, fallback to demo
  const activeOrder = useMemo(() => {
    if (activeOrderData) {
      return activeOrderData;
    }
    // Fallback: show demo if no active order from API
    return DEMO_ACTIVE_ORDER;
  }, [activeOrderData]);

  // Get past orders - use API data if available, fallback to demo
  const pastOrders = useMemo(() => {
    if (Array.isArray(ordersData) && ordersData.length > 0) {
      // Filter out active order and show past orders
      return ordersData.filter((o: any) => o.id !== orderId);
    }
    return DEMO_PAST_ORDERS;
  }, [ordersData, orderId]);

  // Show loading if fetching orders
  if (isLoading || activeOrderLoading) {
    return (
      <ScreenWrapper>
        <View style={styles.header}>
          <Text style={styles.title}>My Orders</Text>
        </View>
        <View style={styles.loaderWrap}>
          <Loader />
        </View>
      </ScreenWrapper>
    );
  }

  // Show error if API failed
  if (isError) {
    return (
      <ScreenWrapper>
        <View style={styles.header}>
          <Text style={styles.title}>My Orders</Text>
        </View>
        <View style={styles.errorWrap}>
          <Text style={styles.errorText}>{(error as Error)?.message ?? 'Failed to load orders'}</Text>
          <Text style={styles.errorSubtext}>Showing demo data</Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.title}>My Orders</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: spacing.xl + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        {/* Active Order Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>ACTIVE ORDER</Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>On its way</Text>
            </View>
          </View>

          {/* Delivery Map Placeholder - Only show if ready & agent on way */}
          {(activeOrder as any)?.timeline?.ready?.done && (activeOrder as any)?.timeline?.on_way?.done ? (
            <View style={styles.mapPlaceholder}>
              <View style={styles.mapGrid}>
                {[...Array(12)].map((_, i) => (
                  <View key={i} style={styles.mapCell} />
                ))}
              </View>
              <View style={styles.mapRoute}>
                <View style={styles.routeDot} />
                <View style={styles.routeLine} />
                <View style={styles.routeDotCenter} />
              </View>
            </View>
          ) : (
            <View style={styles.statusPlaceholder}>
              <MaterialIcons 
                name={(activeOrder as any)?.timeline?.ready?.done ? "local-shipping" : "schedule"} 
                size={48} 
                color={colors.primary} 
                style={styles.statusIcon}
              />
              <Text style={styles.statusTitle}>
                {(activeOrder as any)?.timeline?.ready?.done ? 'Agent on the Way' : 'Item is Preparing'}
              </Text>
              <Text style={styles.statusSubtitle}>
                {(activeOrder as any)?.timeline?.ready?.done 
                  ? 'Your order is ready and agent is arriving soon' 
                  : 'Your order is being prepared at the store'}
              </Text>
            </View>
          )}

          {/* Order Details */}
          <View style={styles.orderCard}>
            <View style={styles.shopHeader}>
              <Image source={{ uri: (activeOrder as any)?.shopImage || DEMO_ACTIVE_ORDER.shopImage }} style={styles.shopImage} />
              <View style={{ flex: 1 }}>
                <Text style={styles.shopName}>{(activeOrder as any)?.shopName || selectedShopName || DEMO_ACTIVE_ORDER.shopName}</Text>
                <Text style={styles.orderMeta}>
                  Order #{(activeOrder as any)?.id || DEMO_ACTIVE_ORDER.id} • {(activeOrder as any)?.distance || DEMO_ACTIVE_ORDER.distance} away
                </Text>
              </View>
              <View style={styles.amountBox}>
                <Text style={styles.amountLabel}>AMOUNT TO PAY</Text>
                <Text style={styles.amountValue}>₹{((activeOrder as any)?.amountToPay || DEMO_ACTIVE_ORDER.amountToPay).toFixed(2)}</Text>
              </View>
            </View>

            {/* Timeline */}
            <View style={styles.timeline}>
              {(activeOrder as any)?.timeline && Object.entries((activeOrder as any).timeline).map(([key, step]: [string, any]) => {
                const isLast = key === 'delivered';
                return (
                  <React.Fragment key={key}>
                    <View style={[styles.timelineStep, step?.done && styles.timelineStepActive]}>
                      <View style={styles.timelineCircle} />
                      <Text style={styles.timelineLabel}>{step?.label}</Text>
                    </View>
                    {!isLast && <View style={[styles.timelineConnector, step?.done && styles.timelineConnectorActive]} />}
                  </React.Fragment>
                );
              })}
            </View>
            <View style={styles.driverSection}>
              <View style={styles.driverCard}>
                <Text style={styles.driverLabel}>YOUR DRIVER</Text>
                <View style={styles.driverRow}>
                  <Image source={{ uri: (activeOrder as any)?.driver?.image || DEMO_ACTIVE_ORDER.driver.image }} style={styles.driverImage} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.driverName}>{(activeOrder as any)?.driver?.name || DEMO_ACTIVE_ORDER.driver.name}</Text>
                    <View style={styles.ratingRow}>
                      <MaterialIcons name="star" size={14} color="#FFD700" />
                      <Text style={styles.driverRating}>{(activeOrder as any)?.driver?.rating || DEMO_ACTIVE_ORDER.driver.rating}</Text>
                    </View>
                  </View>
                  <TouchableOpacity style={styles.contactBtn}>
                    <MaterialIcons name="chat" size={18} color={colors.textPrimary} />
                    <Text style={styles.contactBtnText}>Contact</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Past Orders Section */}
        {pastOrders && pastOrders.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>PAST ORDERS</Text>
              <TouchableOpacity>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            </View>

            {pastOrders.map((order: any) => (
              <TouchableOpacity key={order.id} style={styles.pastOrderCard}>
                <Image source={{ uri: order.shopImage }} style={styles.pastOrderImage} />
                <View style={styles.pastOrderContent}>
                  <Text style={styles.pastOrderShop}>{order.shopName}</Text>
                  <Text style={styles.pastOrderMeta}>
                    {order.date || formatDate(order.createdAt)} • {order.itemCount ? `${order.itemCount} Items` : order.category}
                  </Text>
                </View>
                <View>
                  <Text style={styles.pastOrderTotal}>₹{(order.total || order.amountToPay).toFixed(2)}</Text>
                  <TouchableOpacity style={styles.reorderBtn}>
                    <Text style={styles.reorderText}>Reorder</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    ...typography.screenTitle,
    color: colors.textPrimary,
    fontSize: 28,
  },
  loaderWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  errorText: { ...typography.secondary, color: colors.error, textAlign: 'center' },
  errorSubtext: { ...typography.meta, color: colors.textMuted, textAlign: 'center', marginTop: spacing.sm },
  scroll: { flex: 1 },
  section: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.meta,
    color: colors.textMuted,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  statusBadge: {
    backgroundColor: colors.primaryTint,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs - 2,
    borderRadius: 20,
  },
  statusBadgeText: {
    ...typography.meta,
    color: colors.primary,
    fontWeight: '700',
  },
  mapPlaceholder: {
    position: 'relative',
    backgroundColor: colors.surfaceDark,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.lg,
    minHeight: 200,
    borderWidth: 1,
    borderColor: colors.borderDark,
  },
  statusPlaceholder: {
    backgroundColor: colors.surfaceDark,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    minHeight: 200,
    borderWidth: 1,
    borderColor: colors.borderDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusIcon: {
    marginBottom: spacing.md,
  },
  statusTitle: {
    ...typography.primary,
    color: colors.textPrimary,
    fontWeight: '700',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  statusSubtitle: {
    ...typography.secondary,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  mapGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
  },
  mapCell: {
    flex: 1,
    height: 16,
    backgroundColor: colors.background,
    borderRadius: 2,
  },
  mapRoute: {
    position: 'absolute',
    top: '35%',
    left: '15%',
    right: '15%',
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
  },
  routeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.textMuted,
  },
  routeLine: {
    flex: 1,
    height: 2,
    backgroundColor: colors.primary,
    marginHorizontal: spacing.sm,
    borderStyle: 'dashed',
  },
  routeDotCenter: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orderCard: {
    backgroundColor: colors.surfaceDark,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderDark,
  },
  shopHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  shopImage: {
    width: 50,
    height: 50,
    borderRadius: 10,
    marginRight: spacing.md,
  },
  shopName: {
    ...typography.secondary,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  orderMeta: {
    ...typography.meta,
    color: colors.textMuted,
    marginTop: spacing.xxs,
  },
  amountBox: {
    alignItems: 'flex-end',
  },
  amountLabel: {
    ...typography.meta,
    color: colors.textMuted,
    fontWeight: '600',
    fontSize: 10,
  },
  amountValue: {
    ...typography.secondary,
    fontWeight: '700',
    color: colors.primary,
    fontSize: 16,
    marginTop: spacing.xxs,
  },
  timeline: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderDark,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDark,
  },
  timelineStep: {
    alignItems: 'center',
  },
  timelineStepActive: {},
  timelineCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.textMuted,
    marginBottom: spacing.xs - 2,
  },
  timelineLabel: {
    ...typography.overline,
    color: colors.textMuted,
    fontSize: 10,
  },
  timelineConnector: {
    flex: 1,
    height: 2,
    backgroundColor: colors.textMuted,
    marginHorizontal: spacing.xs - 2,
  },
  timelineConnectorActive: {
    backgroundColor: colors.primary,
  },
  driverSection: {
    paddingTop: spacing.lg,
  },
  driverCard: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: spacing.md,
  },
  driverLabel: {
    ...typography.meta,
    color: colors.textMuted,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  driverImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: spacing.md,
  },
  driverName: {
    ...typography.secondary,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xxs,
    gap: spacing.xxs,
  },
  driverRating: {
    ...typography.meta,
    color: colors.textMuted,
    fontWeight: '600',
  },
  contactBtn: {
    flex: 1,
    marginLeft: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs - 2,
  },
  contactBtnText: {
    ...typography.secondary,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  viewAllText: {
    ...typography.secondary,
    color: colors.primary,
    fontWeight: '700',
  },
  pastOrderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceDark,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderDark,
  },
  pastOrderImage: {
    width: 50,
    height: 50,
    borderRadius: 10,
    backgroundColor: colors.background,
    marginRight: spacing.md,
  },
  pastOrderContent: {
    flex: 1,
  },
  pastOrderShop: {
    ...typography.secondary,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  pastOrderMeta: {
    ...typography.meta,
    color: colors.textMuted,
    marginTop: spacing.xxs,
  },
  pastOrderTotal: {
    ...typography.secondary,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    textAlign: 'right',
  },
  reorderBtn: {
    backgroundColor: colors.primaryTint,
    paddingVertical: spacing.xs - 2,
    paddingHorizontal: spacing.md,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  reorderText: {
    ...typography.meta,
    color: colors.primary,
    fontWeight: '700',
    textAlign: 'center',
  },
});
