/**
 * Payment processing – Demo auto-success after 2s processing
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { colors } from '@/constants/colors';
import { useOrderDraftStore } from '@/store/order-draft.store';

export default function PaymentProcessingScreen() {
  const router = useRouter();
  const orderId = useOrderDraftStore((s) => s.orderId);
  const setOrderId = useOrderDraftStore((s) => s.setOrderId);

  useEffect(() => {
    let cancelled = false;
    
    const run = async () => {
      // If no orderId yet, generate a mock one for demo purposes
      if (!orderId) {
        const mockOrderId = `ORD${Date.now()}`;
        setOrderId(mockOrderId);
      }

      // Start with delay to simulate payment processing
      await new Promise((r) => setTimeout(r, 2000));
      
      if (cancelled) return;

      // For demo: auto-succeed after processing
      router.replace('/order/payment-success');
    };
    run();
    return () => { cancelled = true; };
  }, [orderId, router, setOrderId]);

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
