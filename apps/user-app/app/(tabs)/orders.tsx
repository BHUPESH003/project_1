/**
 * My Orders screen – list from API (GET /orders). Loading, error, empty states.
 */
import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Loader } from '@/components/Loader';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { elevation } from '@/constants/elevation';
import { ordersApi, type OrderListItem } from '@/api/orders.api';

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
}

export default function OrdersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: ordersData, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['orders'],
    queryFn: () => ordersApi.getMyOrders(),
  });

  // Normalize: API may return non-array; ensure array for FlatList
  const orders = Array.isArray(ordersData) ? ordersData : [];

  if (isLoading) {
    return (
      <ScreenWrapper>
        <View style={styles.header}>
          <Text style={styles.title}>My Orders</Text>
        </View>
        <View style={styles.loaderWrap}><Loader /></View>
      </ScreenWrapper>
    );
  }

  if (isError) {
    return (
      <ScreenWrapper>
        <View style={styles.header}>
          <Text style={styles.title}>My Orders</Text>
        </View>
        <View style={styles.errorWrap}>
          <Text style={styles.errorText}>{(error as Error)?.message ?? 'Failed to load orders'}</Text>
          <TouchableOpacity onPress={() => refetch()} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <View style={styles.header}>
        <Text style={styles.title}>My Orders</Text>
      </View>
      <FlatList
        data={orders}
        keyExtractor={(item, index) => item.order_id ?? `order-${index}`}
        contentContainerStyle={[styles.list, { paddingBottom: spacing.lg + 24 + insets.bottom }]}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>No orders yet</Text>
          </View>
        }
        renderItem={({ item, index }: { item: OrderListItem; index: number }) => (
          <TouchableOpacity
            style={[styles.card, elevation.card]}
            onPress={() => router.push(`/order/${item.order_id ?? String(index)}`)}
            activeOpacity={0.88}
          >
            <View style={styles.cardTop}>
              <Text style={styles.orderId}>{item.order_id ?? '—'}</Text>
              <View style={[styles.statusBadge, item.status === 'DELIVERED' && styles.statusDelivered]}>
                <Text style={[styles.statusText, item.status === 'DELIVERED' && styles.statusDeliveredText]}>
                  {(item.status ?? '').replace(/_/g, ' ')}
                </Text>
              </View>
            </View>
            <Text style={styles.shopName}>{item.seller?.shopName ?? '—'}</Text>
            <View style={styles.cardBottom}>
              <Text style={styles.date}>{item.createdAt ? formatDate(item.createdAt) : '—'}</Text>
              <Text style={styles.total}>₹{item.pricing?.totalAmount ?? 0}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDark,
  },
  title: {
    ...typography.screenTitle,
    color: colors.textPrimary,
  },
  loaderWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  errorText: { ...typography.secondary, color: colors.error, marginBottom: spacing.md, textAlign: 'center' },
  retryBtn: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  retryText: { ...typography.secondary, fontWeight: '600', color: colors.primary },
  emptyWrap: { paddingVertical: spacing.xl, alignItems: 'center' },
  emptyText: { ...typography.secondary, color: colors.textMuted },
  list: {
    paddingVertical: spacing.md,
  },
  card: {
    backgroundColor: colors.surfaceDark,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderDark,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  orderId: {
    ...typography.secondary,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  statusBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
    borderRadius: 6,
    backgroundColor: colors.primaryTint,
  },
  statusDelivered: { backgroundColor: colors.successBg },
  statusText: {
    ...typography.overline,
    color: colors.primary,
  },
  statusDeliveredText: { color: colors.successLight },
  shopName: {
    ...typography.primary,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  date: {
    ...typography.meta,
    color: colors.textMuted,
  },
  total: {
    ...typography.primary,
    fontWeight: '700',
    color: colors.primary,
  },
});
