/**
 * Order review – summary from GET order + draft, Proceed to Pay CTA.
 */
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { MaterialIcons } from '@expo/vector-icons';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Loader } from '@/components/Loader';
import { colors } from '@/constants/colors';
import { useOrderDraftStore } from '@/store/order-draft.store';
import { ordersApi } from '@/api/orders.api';

export default function OrderReviewScreen() {
  const router = useRouter();
  const orderId = useOrderDraftStore((s) => s.orderId);
  const file = useOrderDraftStore((s) => s.file);
  const options = useOrderDraftStore((s) => s.options);

  const { data: order, isLoading, isError, error } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => ordersApi.getOrder(orderId!),
    enabled: !!orderId,
  });

  useEffect(() => {
    if (!orderId) router.replace('/order/upload');
  }, [orderId, router]);

  const onProceed = () => router.push('/order/payment-method');

  if (!orderId) return null;
  if (isLoading) {
    return (
      <ScreenWrapper>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Review Order</Text>
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
          <Text style={styles.title}>Review Order</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.errorWrap}>
          <Text style={styles.errorText}>{(error as Error)?.message ?? 'Failed to load order'}</Text>
        </View>
      </ScreenWrapper>
    );
  }

  const fileName = file?.fileName ?? 'Document';
  const copies = options.copies;
  const mode = options.color ? 'Color' : 'Black & White';
  const shop = order?.seller?.shopName ?? '—';
  const delivery = 'Delivery to selected location';
  const total = order?.pricing?.totalAmount ?? 0;

  return (
    <ScreenWrapper>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Review Order</Text>
        <View style={styles.placeholder} />
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Row label="File" value={fileName} />
          <Row label="Copies" value={String(copies)} />
          <Row label="Print mode" value={mode} />
          <Row label="Shop" value={shop} />
          <Row label="Delivery to" value={delivery} />
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>₹{total}</Text>
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <PrimaryButton label="Proceed to Pay" onPress={onProceed} />
      </View>
    </ScreenWrapper>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={1}>{value}</Text>
    </View>
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
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 100 },
  card: {
    backgroundColor: colors.surfaceDark,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.borderDark,
    marginTop: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  rowLabel: { fontSize: 14, color: colors.textMuted },
  rowValue: { fontSize: 14, fontWeight: '600', color: colors.textPrimary, flex: 1, marginLeft: 12, textAlign: 'right' },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    paddingVertical: 16,
  },
  totalLabel: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  totalValue: { fontSize: 20, fontWeight: '700', color: colors.primary },
  footer: { paddingVertical: 24 },
});
