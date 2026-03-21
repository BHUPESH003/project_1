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
import { useThemeColors, useThemedStyles } from '@/theme';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { ordersApi, type OrderListItem } from '@/api/orders.api';

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
  const colors = useThemeColors();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // Fetch all orders from API
  const { data: ordersData, isLoading, isError, error } = useQuery({
    queryKey: ['orders'],
    queryFn: () => ordersApi.getMyOrders(),
  });

  const TERMINAL_STATUSES = ['DELIVERED', 'SELLER_REJECTED', 'ORDER_EXPIRED', 'DELIVERY_FAILED', 'USER_CANCELLED'];

  // Split into active (in progress) and past (delivered/cancelled) orders
  const { activeOrders, pastOrders } = useMemo(() => {
    const orders = Array.isArray(ordersData) ? ordersData : [];
    const active = orders.filter((o) => !TERMINAL_STATUSES.includes(o.status));
    const past = orders.filter((o) => TERMINAL_STATUSES.includes(o.status));
    return {
      activeOrders: active,
      pastOrders: past,
    };
  }, [ordersData]);

  // Debug logging for API verification
  React.useEffect(() => {
    if (ordersData) {
      console.log('Orders API Response Length:', ordersData.length);
      console.log('Active Orders Count:', activeOrders.length);
      if (activeOrders.length > 0) {
        console.log('Sample Active Order Keys:', Object.keys(activeOrders[0]));
      }
    }
  }, [ordersData, activeOrders]);

  // Show loading if fetching orders
  if (isLoading) {
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
        {/* Active Orders Section */}
        {activeOrders.map((order: OrderListItem) => (
          <View key={order.order_id} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>ACTIVE ORDER</Text>
              <View style={styles.statusBadge}>
                <Text style={styles.statusBadgeText}>{order.status.replace(/_/g, ' ')}</Text>
              </View>
            </View>
            <View style={styles.statusPlaceholder}>
              <MaterialIcons name="local-shipping" size={48} color={colors.primary} style={styles.statusIcon} />
              <Text style={styles.statusTitle}>Order in Progress</Text>
              <Text style={styles.statusSubtitle}>Your order is being processed</Text>
            </View>
            <View style={styles.orderCard}>
              <View style={styles.shopHeader}>
                <View style={[styles.shopImage, { backgroundColor: colors.background }]}>
                  <MaterialIcons name="store" size={28} color={colors.textMuted} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.shopName}>{order.seller?.shopName ?? 'Shop'}</Text>
                  <Text style={styles.orderMeta}>Order #{order.order_id}</Text>
                </View>
                <View style={styles.amountBox}>
                  <Text style={styles.amountLabel}>AMOUNT</Text>
                  <Text style={styles.amountValue}>
                    ₹{(order.pricing?.totalAmount ?? order.pricing?.itemCost ?? 0).toFixed(2)}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.contactBtn}
                onPress={() => router.push(`/order/${order.order_id}`)}
              >
                <Text style={styles.contactBtnText}>Track Order</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {activeOrders.length === 0 && pastOrders.length === 0 && !isLoading && (
          <View style={styles.section}>
            <View style={styles.emptyWrap}>
              <MaterialIcons name="receipt-long" size={64} color={colors.textMuted} />
              <Text style={styles.emptyText}>No orders yet</Text>
              <Text style={styles.emptySubtext}>Your orders will appear here</Text>
            </View>
          </View>
        )}

        {/* Past Orders Section */}
        {pastOrders.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>PAST ORDERS</Text>
            </View>
            {pastOrders.map((order: OrderListItem) => (
              <TouchableOpacity
                key={order.order_id}
                style={styles.pastOrderCard}
                onPress={() => router.push(`/order/${order.order_id}`)}
              >
                <View style={[styles.pastOrderImage, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
                  <MaterialIcons name="store" size={24} color={colors.textMuted} />
                </View>
                <View style={styles.pastOrderContent}>
                  <Text style={styles.pastOrderShop}>{order.seller?.shopName ?? 'Shop'}</Text>
                  <Text style={styles.pastOrderMeta}>
                    {formatDate(order.createdAt)} • {order.category?.name ?? ''}
                  </Text>
                </View>
                <View>
                  <Text style={styles.pastOrderTotal}>
                    ₹{(order.pricing?.totalAmount ?? order.pricing?.itemCost ?? 0).toFixed(2)}
                  </Text>
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

const createStyles = (colors: import('@/theme/types').ThemeColors) => StyleSheet.create({
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
  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: spacing.xl * 2 },
  emptyText: { ...typography.primary, color: colors.textPrimary, fontWeight: '600', marginTop: spacing.md },
  emptySubtext: { ...typography.secondary, color: colors.textMuted, marginTop: spacing.xs },
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
