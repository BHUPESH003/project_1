/**
 * Payment method - single order checkout using Razorpay.
 * Supports UPI and card only.
 */
import React, { useMemo, useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import RazorpayCheckout from 'react-native-razorpay';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Loader } from '@/components/Loader';
import { useThemeColors, useThemedStyles } from '@/theme';
import { useOrderDraftStore } from '@/store/order-draft.store';
import { useMultiCartStore } from '@/store/multiCartStore';
import { ordersApi } from '@/api/orders.api';
import { useRazorpayPayment } from '@/hooks/useRazorpayPayment';

type PaymentMethodType = 'upi' | 'card';

export default function PaymentMethodScreen() {
  const colors = useThemeColors();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const orderId = useOrderDraftStore((s) => s.orderId);
  const resetDraft = useOrderDraftStore((s) => s.reset);
  const clearCart = useMultiCartStore((state) => state.clearCart);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodType>('upi');
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: order, isLoading: orderLoading, isError: orderError, error: orderErr } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => ordersApi.getOrder(orderId!),
    enabled: !!orderId,
  });

  const { initiatePayment, verifyPayment } = useRazorpayPayment(orderId ?? '');

  const total = order?.pricing?.totalAmount ?? 0;
  const gatewayMethod = useMemo(
    () => (selectedMethod === 'card' ? 'CARD' : 'UPI'),
    [selectedMethod],
  );

  const launchRazorpay = async () => {
    if (!orderId || !order) {
      Alert.alert('Order Error', 'Order details are not available');
      return;
    }

    setIsProcessing(true);

    try {
      const confirmResponse = await ordersApi.confirmOrder(orderId, gatewayMethod);
      const paymentIntent = confirmResponse.payment?.payment_intent;

      if (!paymentIntent?.gatewayOrderId) {
        throw new Error('Payment intent is missing gateway order information');
      }

      const isRazorpayModuleAvailable =
        !!(RazorpayCheckout && typeof RazorpayCheckout.open === 'function');

      let paymentResult: {
        razorpay_payment_id: string;
        razorpay_order_id: string;
        razorpay_signature: string;
      };

      if (isRazorpayModuleAvailable) {
        paymentResult = await initiatePayment({
          keyId: process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID ?? '',
          amount: paymentIntent.amount ?? total,
          orderId: paymentIntent.gatewayOrderId,
          description: `Order #${orderId}`,
          customerName: order.seller?.shopName,
          theme: { color: colors.primary },
          notes: {
            orderId,
            paymentMethod: gatewayMethod,
          },
          enabledMethods: {
            upi: selectedMethod === 'upi',
            card: selectedMethod === 'card',
          },
        });
      } else {
        const simulateSuccess = await new Promise<boolean>((resolve) => {
          Alert.alert(
            'Payment Simulation',
            'Razorpay native checkout is unavailable in this environment. Simulate a successful payment?',
            [
              { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Simulate Success', onPress: () => resolve(true) },
            ],
          );
        });

        if (!simulateSuccess) {
          throw new Error('Payment cancelled');
        }

        paymentResult = {
          razorpay_payment_id: `pay_sim_${Date.now()}`,
          razorpay_order_id: paymentIntent.gatewayOrderId,
          razorpay_signature: `sig_sim_${Date.now()}`,
        };
      }

      const verified = await verifyPayment(
        paymentResult.razorpay_order_id,
        paymentResult.razorpay_payment_id,
        paymentResult.razorpay_signature,
      );

      if (!verified) {
        throw new Error('Payment verification failed');
      }

      if (order.seller?.id) {
        clearCart(order.seller.id);
      }
      resetDraft();
      router.replace('/order/payment-success');
    } catch (error: any) {
      if (error?.message !== 'Payment cancelled') {
        Alert.alert(
          'Payment Error',
          error?.message || 'Unable to complete payment right now.',
        );
      }
      router.replace('/order/payment-failure');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!orderId) {
    return null;
  }

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
          <Text style={styles.errorText}>
            {(orderErr as Error)?.message ?? 'Failed to load order'}
          </Text>
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
        <TouchableOpacity
          style={[styles.option, selectedMethod === 'upi' && styles.optionActive]}
          onPress={() => setSelectedMethod('upi')}
        >
          <View style={styles.optionLeft}>
            <MaterialIcons name="qr-code-2" size={24} color={colors.primary} />
            <View>
              <Text style={styles.optionLabel}>Razorpay UPI</Text>
              <Text style={styles.optionHint}>Pay with any supported UPI app</Text>
            </View>
          </View>
          <View style={[styles.radio, selectedMethod === 'upi' && styles.radioActive]}>
            {selectedMethod === 'upi' && <View style={styles.radioInner} />}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.option, selectedMethod === 'card' && styles.optionActive, styles.optionMargin]}
          onPress={() => setSelectedMethod('card')}
        >
          <View style={styles.optionLeft}>
            <MaterialIcons name="credit-card" size={24} color={colors.primary} />
            <View>
              <Text style={styles.optionLabel}>Razorpay Card</Text>
              <Text style={styles.optionHint}>Credit and debit cards only</Text>
            </View>
          </View>
          <View style={[styles.radio, selectedMethod === 'card' && styles.radioActive]}>
            {selectedMethod === 'card' && <View style={styles.radioInner} />}
          </View>
        </TouchableOpacity>

        <View style={styles.infoCard}>
          <MaterialIcons name="verified-user" size={18} color={colors.primary} />
          <Text style={styles.infoText}>
            Razorpay checkout is enabled for UPI and card payments only.
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <PrimaryButton
          label={isProcessing ? 'Processing...' : `Pay ₹${total}`}
          onPress={launchRazorpay}
          disabled={isProcessing}
        />
      </View>
    </ScreenWrapper>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 16,
      paddingHorizontal: 4,
    },
    iconBtn: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      flex: 1,
      fontSize: 18,
      fontWeight: '700',
      color: colors.textPrimary,
      textAlign: 'center',
    },
    placeholder: { width: 40 },
    loaderWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    errorWrap: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
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
    optionActive: {
      borderColor: colors.primary,
      backgroundColor: `${colors.primary}10`,
    },
    optionMargin: { marginTop: 12 },
    optionLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    optionLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    optionHint: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 2,
    },
    radio: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: colors.borderDark,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioActive: { borderColor: colors.primary },
    radioInner: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.primary,
    },
    infoCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginTop: 18,
      padding: 14,
      borderRadius: 12,
      backgroundColor: colors.surfaceDark,
    },
    infoText: {
      flex: 1,
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    footer: {
      paddingTop: 16,
      paddingBottom: 8,
    },
  });
