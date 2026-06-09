import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useColors } from '@/theme';
import { spacing, radius } from '@/theme/spacing';
import { fontWeight } from '@/theme/typography';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { Skeleton } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';
import { useOrder, useCancelOrder } from '@/api/hooks/useOrders';
import { showToast } from '@/stores/toastStore';
import type { OrdersStackParamList } from '@/navigation/OrdersStack';
import type { OrderStatus, OrderStateHistory } from '@/api/types';
import dayjs from 'dayjs';

type Nav   = NativeStackNavigationProp<OrdersStackParamList, 'OrderDetail'>;
type Route = RouteProp<OrdersStackParamList, 'OrderDetail'>;

const TIMELINE_STEPS: OrderStatus[] = [
  'CONFIRMED',
  'PROCESSING',
  'READY',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
];

const CANCELLABLE_STATUSES: OrderStatus[] = ['CONFIRMED', 'PROCESSING'];

function stepLabel(status: OrderStatus): string {
  const map: Record<OrderStatus, string> = {
    PENDING_PAYMENT:  'Payment Pending',
    PAYMENT_FAILED:   'Payment Failed',
    CONFIRMED:        'Order Confirmed',
    PROCESSING:       'Being Prepared',
    READY:            'Ready for Pickup',
    OUT_FOR_DELIVERY: 'Out for Delivery',
    DELIVERED:        'Delivered',
    CANCELLED:        'Cancelled',
    REFUNDED:         'Refunded',
  };
  return map[status] ?? status;
}

function badgeVariant(status: OrderStatus): 'success' | 'danger' | 'warning' | 'primary' | 'neutral' {
  if (status === 'DELIVERED' || status === 'REFUNDED') return 'success';
  if (status === 'CANCELLED' || status === 'PAYMENT_FAILED') return 'danger';
  if (status === 'PENDING_PAYMENT') return 'warning';
  if (status === 'CONFIRMED' || status === 'PROCESSING' || status === 'READY' || status === 'OUT_FOR_DELIVERY') return 'primary';
  return 'neutral';
}

function badgeLabel(status: OrderStatus): string {
  const map: Record<OrderStatus, string> = {
    PENDING_PAYMENT:  'Pending',
    PAYMENT_FAILED:   'Failed',
    CONFIRMED:        'Confirmed',
    PROCESSING:       'Preparing',
    READY:            'Ready',
    OUT_FOR_DELIVERY: 'On the way',
    DELIVERED:        'Delivered',
    CANCELLED:        'Cancelled',
    REFUNDED:         'Refunded',
  };
  return map[status] ?? status;
}

interface TimelineProps {
  currentStatus: OrderStatus;
  history: OrderStateHistory[];
}

function Timeline({ currentStatus, history }: TimelineProps) {
  const colors = useColors();
  const isTerminalError = currentStatus === 'CANCELLED' || currentStatus === 'PAYMENT_FAILED';
  const currentIndex = isTerminalError ? -1 : TIMELINE_STEPS.indexOf(currentStatus);

  const historyByStatus = Object.fromEntries(
    history.map((h) => [h.status, h.timestamp]),
  );

  const steps = isTerminalError
    ? history.map((h) => ({ status: h.status, ts: h.timestamp, state: 'done' as const }))
    : TIMELINE_STEPS.map((s, i) => ({
        status: s,
        ts: historyByStatus[s],
        state: (i < currentIndex ? 'done' : i === currentIndex ? 'active' : 'future') as 'done' | 'active' | 'future',
      }));

  return (
    <View style={{ marginTop: spacing.md }}>
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1;
        const dotColor =
          step.state === 'done'   ? colors.success :
          step.state === 'active' ? colors.primary  :
          colors.border;
        const lineColor = step.state === 'done' ? colors.success : colors.border;

        return (
          <View key={step.status} style={styles.timelineRow}>
            <View style={styles.timelineLeft}>
              <View style={[styles.dot, { backgroundColor: dotColor, borderColor: dotColor }]} />
              {!isLast && <View style={[styles.line, { backgroundColor: lineColor }]} />}
            </View>
            <View style={styles.timelineContent}>
              <AppText
                variant="body"
                style={{
                  color: step.state === 'future' ? colors.text3 : colors.text,
                  fontWeight: step.state === 'active' ? fontWeight.semibold : fontWeight.regular,
                }}
              >
                {stepLabel(step.status)}
              </AppText>
              {step.ts && (
                <AppText variant="caption" style={{ color: colors.text3, marginTop: 2 }}>
                  {dayjs(step.ts).format('D MMM, h:mm A')}
                </AppText>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <AppText variant="body" style={{ color: colors.text2, fontWeight: fontWeight.semibold, marginBottom: spacing.md }}>
        {title}
      </AppText>
      {children}
    </View>
  );
}

export function OrderDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const nav    = useNavigation<Nav>();
  const route  = useRoute<Route>();
  const { orderId } = route.params;

  const { data: order, isLoading, isError } = useOrder(orderId);
  const cancelMutation = useCancelOrder();
  const [cancelling, setCancelling] = useState(false);

  async function handleCancel() {
    Alert.alert(
      'Cancel Order',
      'Are you sure you want to cancel this order? Any payment will be refunded.',
      [
        { text: 'Keep Order', style: 'cancel' },
        {
          text: 'Cancel Order',
          style: 'destructive',
          onPress: async () => {
            setCancelling(true);
            try {
              await cancelMutation.mutateAsync(orderId);
              showToast({ type: 'success', message: 'Order cancelled. Refund initiated.' });
              nav.goBack();
            } catch {
              showToast({ type: 'error', message: 'Could not cancel order. Try again.' });
            } finally {
              setCancelling(false);
            }
          },
        },
      ],
    );
  }

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm, borderBottomColor: colors.border }]}>
          <IconButton
            icon={<Text style={{ color: colors.text, fontSize: 18 }}>←</Text>}
            onPress={() => nav.goBack()}
            size={40}
          />
          <Skeleton width={160} height={18} borderRadius={6} />
          <View style={{ width: 40 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: spacing.xl, gap: spacing.md }}>
          <Skeleton width="100%" height={80} borderRadius={radius.lg} />
          <Skeleton width="100%" height={160} borderRadius={radius.lg} />
          <Skeleton width="100%" height={120} borderRadius={radius.lg} />
        </ScrollView>
      </View>
    );
  }

  if (isError || !order) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.bg }]}>
        <AppText variant="body" style={{ color: colors.text3 }}>
          Could not load order details.
        </AppText>
        <Button label="Go Back" variant="ghost" onPress={() => nav.goBack()} />
      </View>
    );
  }

  const canCancel = CANCELLABLE_STATUSES.includes(order.status);
  const itemCount = order.items.reduce((s, i) => s + i.quantity, 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm, borderBottomColor: colors.border }]}>
        <IconButton
          icon={<Text style={{ color: colors.text, fontSize: 18 }}>←</Text>}
          onPress={() => nav.goBack()}
          size={40}
        />
        <AppText variant="title" style={{ color: colors.text }}>Order Details</AppText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Status banner */}
        <View style={[styles.statusBanner, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.statusBannerRow}>
            <View style={{ flex: 1 }}>
              <AppText variant="body" style={{ color: colors.text, fontWeight: fontWeight.semibold }}>
                {order.sellerName}
              </AppText>
              <AppText variant="caption" style={{ color: colors.text3, marginTop: 2 }}>
                Order #{order.id.slice(-8).toUpperCase()}
              </AppText>
            </View>
            <Badge label={badgeLabel(order.status)} variant={badgeVariant(order.status)} />
          </View>
          <AppText variant="caption" style={{ color: colors.text3, marginTop: spacing.sm }}>
            Placed {dayjs(order.createdAt).format('D MMM YYYY, h:mm A')}
          </AppText>
        </View>

        {/* Timeline */}
        <DetailSection title="Order Timeline">
          <Timeline currentStatus={order.status} history={order.stateHistory ?? []} />
        </DetailSection>

        {/* Delivery */}
        {(order.deliveryProvider || order.deliveryEta || order.trackingUrl) && (
          <DetailSection title="Delivery">
            {order.deliveryProvider && (
              <View style={styles.infoRow}>
                <AppText variant="caption" style={{ color: colors.text3 }}>Provider</AppText>
                <AppText variant="body" style={{ color: colors.text }}>{order.deliveryProvider}</AppText>
              </View>
            )}
            {order.deliveryEta && (
              <View style={[styles.infoRow, { marginTop: spacing.sm }]}>
                <AppText variant="caption" style={{ color: colors.text3 }}>ETA</AppText>
                <AppText variant="body" style={{ color: colors.text }}>{order.deliveryEta}</AppText>
              </View>
            )}
            {order.trackingUrl && (
              <TouchableOpacity
                style={[styles.trackBtn, { borderColor: colors.primary }]}
                onPress={() => Linking.openURL(order.trackingUrl!)}
              >
                <AppText variant="body" style={{ color: colors.primary, fontWeight: fontWeight.semibold }}>
                  Track Delivery →
                </AppText>
              </TouchableOpacity>
            )}
          </DetailSection>
        )}

        {/* Seller info */}
        <DetailSection title="Seller">
          <View style={styles.infoRow}>
            <AppText variant="caption" style={{ color: colors.text3 }}>Shop</AppText>
            <AppText variant="body" style={{ color: colors.text }}>{order.sellerName}</AppText>
          </View>
          {order.sellerPhone && (
            <TouchableOpacity
              style={[styles.trackBtn, { borderColor: colors.border, marginTop: spacing.md }]}
              onPress={() => Linking.openURL(`tel:${order.sellerPhone}`)}
            >
              <AppText variant="body" style={{ color: colors.text }}>📞 Call Seller</AppText>
            </TouchableOpacity>
          )}
        </DetailSection>

        {/* Items */}
        <DetailSection title={`Items (${itemCount})`}>
          {order.items.map((item) => (
            <View key={item.id} style={styles.itemRow}>
              <View style={{ flex: 1 }}>
                <AppText variant="body" style={{ color: colors.text }}>{item.productName}</AppText>
                {item.isPrinting && item.printConfig && (
                  <AppText variant="caption" style={{ color: colors.text3, marginTop: 2 }}>
                    {item.printConfig.colorMode === 'color' ? 'Color' : 'B&W'} · {item.printConfig.paperSize} · {item.printConfig.copies} cop{item.printConfig.copies === 1 ? 'y' : 'ies'}
                  </AppText>
                )}
              </View>
              <AppText variant="body" style={{ color: colors.text, marginLeft: spacing.md }}>
                ₹{item.price * item.quantity}
              </AppText>
            </View>
          ))}
        </DetailSection>

        {/* Price breakdown */}
        <DetailSection title="Price Breakdown">
          <View style={styles.infoRow}>
            <AppText variant="body" style={{ color: colors.text2 }}>Items subtotal</AppText>
            <AppText variant="body" style={{ color: colors.text }}>₹{order.total - (order.deliveryPrice ?? 0)}</AppText>
          </View>
          {order.deliveryPrice !== undefined && (
            <View style={[styles.infoRow, { marginTop: spacing.sm }]}>
              <AppText variant="body" style={{ color: colors.text2 }}>Delivery</AppText>
              <AppText variant="body" style={{ color: colors.text }}>₹{order.deliveryPrice}</AppText>
            </View>
          )}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.infoRow}>
            <AppText variant="body" style={{ color: colors.text, fontWeight: fontWeight.semibold }}>Total paid</AppText>
            <AppText variant="body" style={{ color: colors.text, fontWeight: fontWeight.semibold }}>₹{order.total}</AppText>
          </View>
        </DetailSection>

        {/* Delivery address */}
        <DetailSection title="Delivered To">
          <AppText variant="body" style={{ color: colors.text }}>
            {order.deliveryAddress.line1}
            {order.deliveryAddress.line2 ? `, ${order.deliveryAddress.line2}` : ''}
          </AppText>
          <AppText variant="caption" style={{ color: colors.text3, marginTop: 2 }}>
            {order.deliveryAddress.city}
          </AppText>
        </DetailSection>

        {canCancel && (
          <Button
            label={cancelling ? 'Cancelling…' : 'Cancel Order'}
            variant="danger"
            onPress={handleCancel}
            disabled={cancelling}
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
  },
  scroll: {
    padding: spacing.xl,
    gap: spacing.md,
  },
  statusBanner: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
  },
  statusBannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  section: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
  },
  timelineRow: {
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 48,
  },
  timelineLeft: {
    alignItems: 'center',
    width: 20,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    marginTop: 4,
  },
  line: {
    width: 2,
    flex: 1,
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  trackBtn: {
    marginTop: spacing.md,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  divider: {
    height: 1,
    marginVertical: spacing.md,
  },
});
