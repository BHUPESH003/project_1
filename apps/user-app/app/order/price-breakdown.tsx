/**
 * Price breakdown – from GET order (itemCost, deliveryFee, totalAmount).
 */
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { MaterialIcons } from '@expo/vector-icons';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Loader } from '@/components/Loader';
import { colors } from '@/constants/colors';
import { useOrderDraftStore } from '@/store/order-draft.store';
import { ordersApi } from '@/api/orders.api';

export default function PriceBreakdownScreen() {
  const router = useRouter();
  const orderId = useOrderDraftStore((s) => s.orderId);

  const { data: order, isLoading, isError, error } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => ordersApi.getOrder(orderId!),
    enabled: !!orderId,
  });

  useEffect(() => {
    if (!orderId) router.replace('/order/upload');
  }, [orderId, router]);

  const onContinue = () => router.push('/order/review');

  if (!orderId) return null;
  if (isLoading) {
    return (
      <ScreenWrapper>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Price Breakdown</Text>
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
          <Text style={styles.title}>Price Breakdown</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.errorWrap}>
          <Text style={styles.errorText}>{(error as Error)?.message ?? 'Failed to load order'}</Text>
        </View>
      </ScreenWrapper>
    );
  }

  const p = order?.pricing ?? {};
  const printing = p.itemCost ?? 0;
  const delivery = p.deliveryFee ?? 0;
  const total = p.totalAmount ?? printing + delivery;

  return (
    <ScreenWrapper>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Price Breakdown</Text>
        <View style={styles.placeholder} />
      </View>
      <View style={styles.content}>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Printing cost</Text>
          <Text style={styles.rowValue}>₹{printing}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Delivery</Text>
          <Text style={styles.rowValue}>₹{delivery}</Text>
        </View>
        <View style={[styles.row, styles.totalRow]}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>₹{total}</Text>
        </View>
      </View>
      <View style={styles.footer}>
        <PrimaryButton label="Continue" onPress={onContinue} />
      </View>
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
  loaderWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorText: { fontSize: 14, color: colors.error },
  content: { flex: 1, paddingTop: 24 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  rowLabel: { fontSize: 16, color: colors.textSecondary },
  rowValue: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  totalRow: { borderBottomWidth: 0, marginTop: 8, paddingVertical: 20 },
  totalLabel: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  totalValue: { fontSize: 20, fontWeight: '700', color: colors.primary },
  footer: { paddingVertical: 24 },
});
