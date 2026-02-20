/**
 * Payment processing – Verify payment after gateway completion
 * Polls backend for payment confirmation or waits for webhook
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { useThemeColors, useThemedStyles } from '@/theme';
import { useOrderDraftStore } from '@/store/order-draft.store';
import { paymentsApi } from '@/api/payments.api';

export default function PaymentProcessingScreen() {
  const colors = useThemeColors();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const { paymentId, method } = useLocalSearchParams();
  const orderId = useOrderDraftStore((s) => s.orderId);
  const [verifyAttempt, setVerifyAttempt] = useState(0);

  // Verify payment mutation
  const verifyMutation = useMutation({
    mutationFn: async () => {
      if (!orderId) throw new Error('No order found');
      
      // If paymentId provided, verify with Razorpay signature
      if (paymentId && method === 'razorpay') {
        return paymentsApi.verifyPayment(orderId, {
          razorpay_payment_id: paymentId as string,
        });
      }
      
      // Otherwise poll payment status
      return paymentsApi.verifyPaymentStatus(orderId);
    },
    onSuccess: (result) => {
      if (result.status === 'SUCCESS') {
        // Payment successful - go to success page
        router.replace('/order/payment-success');
      } else if (result.status === 'FAILED') {
        // Payment failed - go to failure page
        router.replace('/order/payment-failure');
      } else {
        // Still pending - retry after delay
        setTimeout(() => {
          setVerifyAttempt(prev => prev + 1);
        }, 2000);
      }
    },
    onError: (error: any) => {
      // On error, still allow user to check status manually
      const msg = error?.response?.data?.message || error?.message || 'Payment verification failed';
      Alert.alert('Verification Failed', msg, [
        { text: 'Retry', onPress: () => setVerifyAttempt(prev => prev + 1) },
        { text: 'Go Back', onPress: () => router.back() },
      ]);
    },
  });

  useEffect(() => {
    let cancelled = false;
    
    const run = async () => {
      if (!orderId) {
        router.replace('/checkout');
        return;
      }

      // Initial delay before verification
      await new Promise((r) => setTimeout(r, 1500));
      
      if (cancelled) return;

      // Verify payment
      if (!verifyMutation.isPending) {
        verifyMutation.mutate();
      }
    };
    
    run();
    return () => { cancelled = true; };
  }, [orderId, verifyAttempt]);

  if (!orderId) return null;

  return (
    <ScreenWrapper>
      <View style={styles.content}>
        <ActivityIndicator size="large" color={colors.primary} style={styles.spinner} />
        <Text style={styles.title}>Processing payment…</Text>
        <Text style={styles.subtitle}>Please wait. Do not close the app.</Text>
        {verifyAttempt > 0 && (
          <Text style={styles.attempt}>Attempt {verifyAttempt + 1}</Text>
        )}
      </View>
    </ScreenWrapper>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  spinner: { marginBottom: 24 },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
  },
  attempt: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 16,
  },
});
