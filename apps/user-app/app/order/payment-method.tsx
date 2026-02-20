/**
 * Payment method – select provider (Razorpay or Paytm), confirm order, then payment-processing.
 * 
 * Note: Razorpay uses web-based checkout for Expo Go compatibility.
 * For production builds, implement native Razorpay integration.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Loader } from '@/components/Loader';
import { useThemeColors, useThemedStyles } from '@/theme';
import { useOrderDraftStore } from '@/store/order-draft.store';
import { ordersApi } from '@/api/orders.api';
import { paymentsApi, PaymentProvider } from '@/api/payments.api';

type PaymentMethodType = 'razorpay' | 'paytm';

export default function PaymentMethodScreen() {
  const colors = useThemeColors();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const orderId = useOrderDraftStore((s) => s.orderId);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodType>('razorpay');
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: order, isLoading: orderLoading, isError: orderError, error: orderErr } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => ordersApi.getOrder(orderId!),
    enabled: !!orderId,
  });

  const confirmMutation = useMutation({
    mutationFn: async (method: PaymentMethodType) => {
      if (method === 'razorpay') {
        // Create payment intent for Razorpay (web-based for Expo compatibility)
        return paymentsApi.createPaymentIntent(orderId!, PaymentProvider.RAZORPAY);
      } else {
        // Confirm order for Paytm (legacy flow)
        return ordersApi.confirmOrder(orderId!, 'UPI');
      }
    },
    onSuccess: async (res, method) => {
      if (method === 'razorpay') {
        // Handle Razorpay payment via web checkout
        try {
          const paymentData = res.payment_intent?.paymentData || {};
          const amount = res.amount || order?.pricing?.totalAmount || 0;
          
          // For web-based Razorpay, show informational alert and route to processing
          // In production with native build, use react-native-razorpay
          Alert.alert(
            'Razorpay Payment – Expo Mode',
            `Payment Amount: ₹${amount}\n\nIn Expo Go, Razorpay requires a full build with native modules.\n\nFor development testing:\n• Create an EAS build (eas build)\n• Use native Razorpay SDK\n• Or switch to Paytm for testing`,
            [
              {
                text: 'Switch to Paytm',
                onPress: () => {
                  setSelectedMethod('paytm');
                  setIsProcessing(false);
                },
                style: 'default',
              },
              {
                text: 'Simulate Success',
                onPress: () => {
                  // Simulate successful payment for testing
                  router.replace({
                    pathname: '/order/payment-processing',
                    params: { paymentId: `rzp_${Date.now()}`, method: 'razorpay' },
                  });
                },
                style: 'default',
              },
              {
                text: 'Cancel',
                onPress: () => setIsProcessing(false),
                style: 'cancel',
              },
            ]
          );
        } catch (error: any) {
          Alert.alert('Payment Error', error?.message || 'Failed to initiate Razorpay payment');
          setIsProcessing(false);
        }
      } else {
        // Handle Paytm payment (legacy)
        const url = res?.payment?.payment_intent?.paymentData?.upi?.paymentUrl;
        if (url) {
          const canOpen = await Linking.canOpenURL(url);
          if (canOpen) {
            await Linking.openURL(url);
            // After user completes payment on Paytm, route to processing
            setTimeout(() => {
              router.replace('/order/payment-processing');
            }, 1000);
          }
        } else {
          router.replace('/order/payment-processing');
        }
      }
    },
    onError: (error: any) => {
      Alert.alert('Order Error', error?.message || 'Failed to confirm order');
      setIsProcessing(false);
    },
  });

  useEffect(() => {
    if (!orderId) router.replace('/checkout');
  }, [orderId, router]);

  const total = order?.pricing?.totalAmount ?? 0;
  const onPay = () => {
    if (!selectedMethod) {
      Alert.alert('Select Method', 'Please select a payment method');
      return;
    }
    setIsProcessing(true);
    confirmMutation.mutate(selectedMethod);
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
        <View style={styles.loaderWrap}>
          <Loader />
        </View>
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
        {/* Razorpay Option */}
        <TouchableOpacity
          style={[styles.option, selectedMethod === 'razorpay' && styles.optionActive]}
          onPress={() => setSelectedMethod('razorpay')}
        >
          <View style={styles.optionLeft}>
            <MaterialIcons name="payment" size={24} color={colors.primary} />
            <View>
              <Text style={styles.optionLabel}>Razorpay</Text>
              <Text style={styles.optionHint}>UPI • Cards • Wallets</Text>
            </View>
          </View>
          <View style={[styles.radio, selectedMethod === 'razorpay' && styles.radioActive]}>
            {selectedMethod === 'razorpay' && <View style={styles.radioInner} />}
          </View>
        </TouchableOpacity>

        {/* Paytm Option */}
        <TouchableOpacity
          style={[styles.option, selectedMethod === 'paytm' && styles.optionActive, styles.optionMargin]}
          onPress={() => setSelectedMethod('paytm')}
        >
          <View style={styles.optionLeft}>
            <MaterialIcons name="account-balance-wallet" size={24} color={colors.primary} />
            <View>
              <Text style={styles.optionLabel}>Paytm</Text>
              <Text style={styles.optionHint}>UPI • Payment in browser</Text>
            </View>
          </View>
          <View style={[styles.radio, selectedMethod === 'paytm' && styles.radioActive]}>
            {selectedMethod === 'paytm' && <View style={styles.radioInner} />}
          </View>
        </TouchableOpacity>

        {confirmMutation.isError && (
          <Text style={styles.errorText}>{(confirmMutation.error as Error)?.message}</Text>
        )}
      </View>
      <View style={styles.footer}>
        <PrimaryButton
          label={isProcessing ? 'Processing…' : `Pay ₹${total}`}
          onPress={onPay}
          disabled={isProcessing || confirmMutation.isPending}
        />
      </View>
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
  optionMargin: { marginTop: 12 },
  optionLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  optionLabel: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  optionHint: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.borderDark,
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
