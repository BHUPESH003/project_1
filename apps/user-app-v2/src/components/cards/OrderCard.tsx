import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useColors } from '@/theme';
import { spacing, radius } from '@/theme/spacing';
import { fontSize, fontWeight } from '@/theme/typography';
import { AppText } from '@/components/ui/AppText';
import type { Order, OrderStatus } from '@/api/types';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

interface Props {
  order: Order;
  onPress: () => void;
  compact?: boolean;
}

function statusLabel(status: OrderStatus): string {
  const map: Record<OrderStatus, string> = {
    PENDING_PAYMENT:  'Pending Payment',
    PAYMENT_FAILED:   'Payment Failed',
    CONFIRMED:        'Confirmed',
    PROCESSING:       'Preparing',
    READY:            'Ready for Pickup',
    OUT_FOR_DELIVERY: 'Out for Delivery',
    DELIVERED:        'Delivered',
    CANCELLED:        'Cancelled',
    REFUNDED:         'Refunded',
  };
  return map[status] ?? status;
}

function useStatusColor(status: OrderStatus) {
  const colors = useColors();
  const map: Record<OrderStatus, { bg: string; text: string }> = {
    PENDING_PAYMENT:  { bg: colors.warningSoft,   text: colors.warning },
    PAYMENT_FAILED:   { bg: colors.dangerSoft,    text: colors.danger },
    CONFIRMED:        { bg: colors.primarySoft,   text: colors.primary },
    PROCESSING:       { bg: colors.primarySoft,   text: colors.primary },
    READY:            { bg: colors.accentSoft,    text: colors.accent },
    OUT_FOR_DELIVERY: { bg: colors.accentSoft,    text: colors.accent },
    DELIVERED:        { bg: colors.successSoft,   text: colors.success },
    CANCELLED:        { bg: colors.surface3,      text: colors.text3 },
    REFUNDED:         { bg: colors.surface3,      text: colors.text3 },
  };
  return map[status] ?? { bg: colors.surface3, text: colors.text3 };
}

function OrderCardComponent({ order, onPress, compact = false }: Props) {
  const colors = useColors();
  const statusColor = useStatusColor(order.status);
  const itemCount = order.items.reduce((s, i) => s + i.quantity, 0);

  if (compact) {
    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={onPress}
        activeOpacity={0.75}
      >
        <View style={styles.compactRow}>
          <View style={styles.compactLeft}>
            <AppText variant="body" numberOfLines={1} style={{ flex: 1 }}>
              {order.sellerName}
            </AppText>
            <AppText variant="caption" style={{ color: colors.text3, marginTop: 2 }}>
              {itemCount} item{itemCount !== 1 ? 's' : ''} · ₹{order.total}
            </AppText>
            <AppText variant="caption" style={{ color: colors.text3, marginTop: 1 }}>
              {dayjs(order.createdAt).fromNow()}
            </AppText>
          </View>
          <View style={[styles.pill, { backgroundColor: statusColor.bg }]}>
            <AppText variant="caption" style={{ color: statusColor.text, fontWeight: fontWeight.semibold }}>
              {statusLabel(order.status)}
            </AppText>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.card, styles.activeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={styles.activeHeader}>
        <AppText variant="body" style={{ flex: 1 }} numberOfLines={1}>
          {order.sellerName}
        </AppText>
        <View style={[styles.pill, { backgroundColor: statusColor.bg }]}>
          <AppText variant="caption" style={{ color: statusColor.text, fontWeight: fontWeight.semibold }}>
            {statusLabel(order.status)}
          </AppText>
        </View>
      </View>

      <AppText variant="caption" style={{ color: colors.text3, marginTop: spacing.xs }}>
        {itemCount} item{itemCount !== 1 ? 's' : ''} · Order #{order.id.slice(-6).toUpperCase()}
      </AppText>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <View style={styles.activeFooter}>
        <AppText variant="caption" style={{ color: colors.text2 }}>
          Total paid
        </AppText>
        <AppText variant="body" style={{ color: colors.text }}>
          ₹{order.total}
        </AppText>
      </View>

      {order.deliveryEta && (
        <View style={[styles.etaBanner, { backgroundColor: colors.primarySoft }]}>
          <AppText variant="caption" style={{ color: colors.primary }}>
            Estimated delivery: {order.deliveryEta}
          </AppText>
        </View>
      )}
    </TouchableOpacity>
  );
}

export const OrderCard = React.memo(OrderCardComponent);

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  activeCard: {
    padding: spacing.lg,
  },
  activeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  divider: {
    height: 1,
    marginVertical: spacing.md,
  },
  activeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  etaBanner: {
    marginTop: spacing.md,
    marginHorizontal: -spacing.lg,
    marginBottom: -spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  compactLeft: {
    flex: 1,
  },
});
