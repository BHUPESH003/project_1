/**
 * Payment processing – poll verify until SUCCESS or FAILED / timeout.
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { colors } from '@/constants/colors';
import { useOrderDraftStore } from '@/store/order-draft.store';
import { paymentsApi, type PaymentVerifyStatus } from '@/api/payments.api';

const POLL_INTERVAL_MS = 2500;
const TIMEOUT_MS = 5 * 60 * 1000; // 5 min

export default function PaymentProcessingScreen() {
  const router = useRouter();
  const orderId = useOrderDraftStore((s) => s.orderId);
  const startRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!orderId) {
      router.replace('/order/upload');
      return;
    }

    let cancelled = false;
    const run = async () => {
      while (!cancelled) {
        if (Date.now() - startRef.current > TIMEOUT_MS) {
          router.replace('/order/payment-failure');
          return;
        }
        try {
          const res = await paymentsApi.verifyPayment(orderId);
          const status = res?.status as PaymentVerifyStatus | undefined;
          if (cancelled) return;
          if (status === 'SUCCESS') {
            router.replace('/order/payment-success');
            return;
          }
          if (status === 'FAILED') {
            router.replace('/order/payment-failure');
            return;
          }
        } catch {
          // keep polling
        }
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      }
    };
    run();
    return () => { cancelled = true; };
  }, [orderId, router]);

  return (
    <ScreenWrapper>
      <View style={styles.content}>
        <ActivityIndicator size="large" color={colors.primary} style={styles.spinner} />
        <Text style={styles.title}>Processing payment…</Text>
        <Text style={styles.subtitle}>Please wait. Do not close the app.</Text>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
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
});
