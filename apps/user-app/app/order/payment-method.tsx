/**
 * Payment method – confirm order, open UPI URL, then payment-processing.
 */
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Loader } from '@/components/Loader';
import { colors } from '@/constants/colors';
import { useOrderDraftStore } from '@/store/order-draft.store';
import { ordersApi } from '@/api/orders.api';

export default function PaymentMethodScreen() {
  const router = useRouter();
  const orderId = useOrderDraftStore((s) => s.orderId);

  const { data: order, isLoading: orderLoading, isError: orderError, error: orderErr } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => ordersApi.getOrder(orderId!),
    enabled: !!orderId,
  });

  const confirmMutation = useMutation({
    mutationFn: () => ordersApi.confirmOrder(orderId!, 'UPI'),
    onSuccess: async (res) => {
      const url = res?.payment?.payment_intent?.paymentData?.upi?.paymentUrl;
      if (url) {
        const canOpen = await Linking.canOpenURL(url);
        if (canOpen) await Linking.openURL(url);
      }
      router.replace('/order/payment-processing');
    },
    onError: () => {},
  });

  useEffect(() => {
    if (!orderId) router.replace('/order/upload');
  }, [orderId, router]);

  const total = order?.pricing?.totalAmount ?? 0;
  const onPay = () => {
    confirmMutation.mutate();
  };

  if (!orderId) return null;
  if (orderLoading) {
    return (
      <ScreenWrapper>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Payment Method</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loaderWrap}><Loader /></View>
      </ScreenWrapper>
    );
  }
  if (orderError) {
    return (
      <ScreenWrapper>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Payment Method</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.errorWrap}>
          <Text style={styles.errorText}>{(orderErr as Error)?.message ?? 'Failed to load order'}</Text>
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
        <Text style={styles.title}>Payment Method</Text>
        <View style={styles.placeholder} />
      </View>
      <View style={styles.content}>
        <TouchableOpacity style={[styles.option, styles.optionActive]}>
          <View style={styles.optionLeft}>
            <MaterialIcons name="account-balance-wallet" size={24} color={colors.primary} />
            <View>
              <Text style={styles.optionLabel}>UPI</Text>
              <Text style={styles.optionHint}>Paytm • Complete payment in browser</Text>
            </View>
          </View>
          <View style={[styles.radio, styles.radioActive]}>
            <View style={styles.radioInner} />
          </View>
        </TouchableOpacity>
        {confirmMutation.isError && (
          <Text style={styles.errorText}>{(confirmMutation.error as Error)?.message}</Text>
        )}
      </View>
      <View style={styles.footer}>
        <PrimaryButton
          label={confirmMutation.isPending ? 'Opening…' : `Pay ₹${total}`}
          onPress={onPay}
          disabled={confirmMutation.isPending}
        />
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
  errorText: { fontSize: 14, color: colors.error, marginTop: 12 },
  content: { flex: 1, paddingTop: 24 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: colors.surfaceDark,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderDark,
  },
  optionActive: { borderColor: colors.primary },
  optionLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  optionLabel: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  optionHint: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.radioBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: { borderColor: colors.primary },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  footer: { paddingVertical: 24 },
});
