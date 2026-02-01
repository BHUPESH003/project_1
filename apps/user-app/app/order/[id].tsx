/**
 * Order tracking – GET order, timeline from stateHistory.
 */
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { MaterialIcons } from '@expo/vector-icons';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Loader } from '@/components/Loader';
import { colors } from '@/constants/colors';
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
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const id = (params.id as string) ?? '';

  const { data: order, isLoading, isError, error } = useQuery({
    queryKey: ['order', id],
    queryFn: () => ordersApi.getOrder(id),
    enabled: !!id,
  });

  const timeline = buildTimeline(order?.stateHistory);
  const statusStr = order?.status ? (STATUS_LABELS[order.status] ?? order.status.replace(/_/g, ' ')) : '—';
  const isFailure =
    order?.status === 'ORDER_EXPIRED' ||
    order?.status === 'SELLER_REJECTED' ||
    order?.status === 'DELIVERY_FAILED' ||
    order?.status === 'USER_CANCELLED';

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

const styles = StyleSheet.create({
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
    borderColor: 'rgba(13, 89, 242, 0.3)',
  },
  badgeText: { fontSize: 12, fontWeight: '500', color: colors.primary },
  badgeSuccess: { backgroundColor: colors.successBg, borderColor: colors.successBorder },
  badgeSuccessText: { fontSize: 12, fontWeight: '500', color: colors.successLight },
  badgeFailure: { backgroundColor: colors.errorBg ?? '#fde8e8', borderColor: colors.error },
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
});
