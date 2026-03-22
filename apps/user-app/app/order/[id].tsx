/**
 * Order tracking – GET order, timeline from stateHistory.
 */
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { MaterialIcons } from '@expo/vector-icons';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Loader } from '@/components/Loader';
import { useThemeColors, useThemedStyles } from '@/theme';
import { ordersApi, type OrderStateHistoryItem } from '@/api/orders.api';

const STATUS_LABELS: Record<string, string> = {
  CREATED: 'Order Placed',
  SELLER_SELECTED: 'Seller Selected',
  PAID: 'Paid',
  SELLER_ACCEPTED: 'Accepted',
  PREPARING: 'Printing',
  READY_FOR_PICKUP: 'Ready for Pickup',
  PICKED_UP: 'Picked Up',
  DELIVERED: 'Delivered',
  SELLER_REJECTED: 'Rejected',
  ORDER_EXPIRED: 'Expired',
  DELIVERY_FAILED: 'Delivery Failed',
  USER_CANCELLED: 'Cancelled',
};

function formatTime(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '—';
  }
}

function buildTimeline(history: OrderStateHistoryItem[] | undefined) {
  if (!history?.length) return [];
  return history.map((h) => ({
    id: h.id,
    label: STATUS_LABELS[h.toStatus] ?? h.toStatus.replace(/_/g, ' '),
    time: formatTime(h.createdAt),
    desc: h.reason ?? `Status: ${h.toStatus}`,
    done: true,
  }));
}

export default function OrderTrackingScreen() {
  const colors = useThemeColors();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const id = (params.id as string) ?? '';

  const { data: order, isLoading, isError, error } = useQuery({
    queryKey: ['order', id],
    queryFn: () => ordersApi.getOrder(id),
    enabled: !!id,
  });

  // Debug logging for detail verification
  React.useEffect(() => {
    if (order) {
      console.log('[DEBUG] Order Detail Fetched:', order.order_id);
      console.log('[DEBUG] Items count:', order.items?.length);
      console.log('[DEBUG] Pricing:', JSON.stringify(order.pricing));
      if (order.items && order.items.length > 0) {
        console.log('[DEBUG] First item:', JSON.stringify(order.items[0]));
      }
    }
  }, [order]);

  const timeline = buildTimeline(order?.stateHistory);
  const statusStr = order?.status ? (STATUS_LABELS[order.status] ?? order.status.replace(/_/g, ' ')) : '—';
  const isFailure =
    order?.status === 'ORDER_EXPIRED' ||
    order?.status === 'SELLER_REJECTED' ||
    order?.status === 'DELIVERY_FAILED' ||
    order?.status === 'USER_CANCELLED';
  
  const showTracking = (order?.status === 'PICKED_UP' || order?.status === 'READY_FOR_PICKUP') && order?.delivery?.trackingUrl;

  const handleTrackLive = () => {
    if (order?.delivery?.trackingUrl) {
      Linking.openURL(order.delivery.trackingUrl).catch(err => {
        console.error("Failed to open tracking URL", err);
      });
    }
  };

  if (!id) {
    router.replace('/(tabs)/orders');
    return null;
  }
  if (isLoading) {
    return (
      <ScreenWrapper>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Order</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loaderWrap}><Loader /></View>
      </ScreenWrapper>
    );
  }
  if (isError) {
    return (
      <ScreenWrapper>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Order</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.errorWrap}>
          <Text style={styles.errorText}>{(error as Error)?.message ?? 'Failed to load order'}</Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Order #{id.slice(-8)}</Text>
        <View style={styles.placeholder} />
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.shopName}>{order?.seller?.shopName ?? '—'}</Text>
          <View style={styles.badges}>
            <View style={[styles.badge, isFailure && styles.badgeFailure]}>
              <Text style={[styles.badgeText, isFailure && styles.badgeFailureText]}>{statusStr}</Text>
            </View>
          </View>
        </View>

        {/* DEBUG SECTION */}
        <View style={{ backgroundColor: '#1a1a1a', padding: 8, borderRadius: 8, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: '#006c5c' }}>
          <Text style={{ color: '#aaa', fontSize: 10, marginBottom: 4 }}>DEBUG DATA (Tap to hide later)</Text>
          <Text style={{ color: '#fff', fontSize: 12 }}>Items: {order?.items?.length || 0}</Text>
          <Text style={{ color: '#fff', fontSize: 12 }}>Pricing: {JSON.stringify(order?.pricing)}</Text>
        </View>

        {showTracking && (
          <View style={styles.trackingCard}>
            <View style={styles.trackingHeader}>
              <View style={styles.trackingIconBg}>
                <MaterialIcons name="local-shipping" size={24} color={colors.primary} />
              </View>
              <View style={styles.trackingInfo}>
                <Text style={styles.trackingTitle}>Your order is on the way</Text>
                <Text style={styles.trackingSubtitle}>
                  {order?.delivery?.providerName ? `via ${order.delivery.providerName}` : 'Live Tracking Available'}
                </Text>
              </View>
            </View>
            <TouchableOpacity 
              style={styles.trackBtn} 
              onPress={handleTrackLive}
              activeOpacity={0.8}
            >
              <Text style={styles.trackBtnText}>Track Live</Text>
              <MaterialIcons name="chevron-right" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
        )}

        {/* ITEMS LIST */}
        <Text style={styles.sectionTitle}>ITEMS</Text>
        <View style={styles.itemsCard}>
          {order?.items && order.items.length > 0 ? (
            order.items.map((item, idx) => (
              <View key={idx} style={styles.itemRow}>
                <View style={styles.itemMain}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemMeta}>Qty: {item.quantity}</Text>
                </View>
                <Text style={styles.itemPrice}>₹{(item.price * item.quantity).toFixed(2)}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.timelineDesc}>No items available</Text>
          )}
        </View>

        {/* ADDRESS */}
        <Text style={styles.sectionTitle}>DELIVERY ADDRESS</Text>
        <View style={styles.addressCard}>
          <View style={styles.addressRow}>
            <MaterialIcons name="location-on" size={20} color={colors.primary} />
            <Text style={styles.addressText}>{order?.dropAddress || 'No address provided'}</Text>
          </View>
        </View>

        {/* PRICING BREAKDOWN */}
        <Text style={styles.sectionTitle}>PRICING</Text>
        <View style={styles.pricingCard}>
          <View style={styles.pricingRow}>
            <Text style={styles.pricingLabel}>Item Total</Text>
            <Text style={styles.pricingValue}>₹{(order?.pricing?.itemCost || 0).toFixed(2)}</Text>
          </View>
          <View style={styles.pricingRow}>
            <Text style={styles.pricingLabel}>Delivery Fee</Text>
            <Text style={styles.pricingValue}>₹{(order?.pricing?.deliveryFee || 0).toFixed(2)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalValue}>₹{(order?.pricing?.totalAmount || 0).toFixed(2)}</Text>
          </View>
        </View>

        {/* TIMELINE */}
        <Text style={styles.sectionTitle}>ORDER TIMELINE</Text>
        {timeline.length > 0 && (
          <View style={styles.timeline}>
            {timeline.map((step, i) => (
              <View key={step.id} style={styles.timelineRow}>
                <View style={styles.timelineLeft}>
                  <View style={[styles.dot, step.done && styles.dotDone]}>
                    {step.done && <MaterialIcons name="check" size={16} color={colors.textPrimary} />}
                  </View>
                  {i < timeline.length - 1 && <View style={[styles.line, step.done && styles.lineDone]} />}
                </View>
                <View style={styles.timelineContent}>
                  <View style={styles.timelineHeader}>
                    <Text style={styles.timelineLabel}>{step.label}</Text>
                    <Text style={styles.timelineTime}>{step.time}</Text>
                  </View>
                  <Text style={styles.timelineDesc}>{step.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 4,
  },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: 18, fontWeight: '700', color: colors.textPrimary, textAlign: 'center' },
  placeholder: { width: 40 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 48 },
  loaderWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorText: { fontSize: 14, color: colors.error },
  card: {
    backgroundColor: colors.surfaceDark,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.borderDark,
  },
  shopName: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginBottom: 8 },
  badges: { flexDirection: 'row', gap: 8, marginTop: 12 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: colors.primaryTint,
    borderWidth: 1,
    borderColor: colors.primaryGlow,
  },
  badgeText: { fontSize: 12, fontWeight: '500', color: colors.primary },
  badgeSuccess: { backgroundColor: colors.successBg, borderColor: colors.successBorder },
  badgeSuccessText: { fontSize: 12, fontWeight: '500', color: colors.successLight },
  badgeFailure: { backgroundColor: colors.errorBg, borderColor: colors.error },
  badgeFailureText: { color: colors.error },
  timeline: { paddingLeft: 4 },
  timelineRow: { flexDirection: 'row', marginBottom: 0 },
  timelineLeft: { alignItems: 'center', width: 32 },
  dot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotDone: { backgroundColor: colors.primary },
  line: {
    width: 2,
    flex: 1,
    minHeight: 40,
    backgroundColor: colors.surfaceMuted,
    marginTop: 4,
  },
  lineDone: { backgroundColor: colors.primary },
  timelineContent: { flex: 1, paddingLeft: 12, paddingBottom: 24 },
  timelineHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  timelineLabel: { fontSize: 16, fontWeight: '500', color: colors.textPrimary },
  timelineTime: { fontSize: 12, color: colors.textMuted },
  timelineDesc: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
  trackingCard: {
    backgroundColor: colors.surfaceDark,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.primary + '33', // Subtle primary border
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  trackingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  trackingIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  trackingInfo: {
    flex: 1,
  },
  trackingTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  trackingSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  trackBtn: {
    backgroundColor: colors.primary,
    height: 52,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  trackBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 12,
    marginTop: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  itemsCard: {
    backgroundColor: colors.surfaceDark,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.borderDark,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDark,
  },
  itemMain: {
    flex: 1,
    marginRight: 12,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  itemMeta: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  pricingCard: {
    backgroundColor: colors.surfaceDark,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.borderDark,
  },
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  pricingLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  pricingValue: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.borderDark,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
  },
  addressCard: {
    backgroundColor: colors.surfaceDark,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.borderDark,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  addressText: {
    flex: 1,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
