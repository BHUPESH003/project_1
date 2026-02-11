/**
 * Payment success – CTA to track order (orderId from store).
 */
import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { PrimaryButton } from '@/components/PrimaryButton';
import { colors } from '@/constants/colors';
import { useOrderDraftStore } from '@/store/order-draft.store';

export default function PaymentSuccessScreen() {
  const router = useRouter();
  const orderId = useOrderDraftStore((s) => s.orderId);
  const reset = useOrderDraftStore((s) => s.reset);

  useEffect(() => {
    if (!orderId) router.replace('/(tabs)/orders');
  }, [orderId, router]);

  const onTrackOrder = () => {
    const id = orderId;
    reset();
    if (id) router.replace(`/order/${id}`);
    else router.replace('/(tabs)/orders');
  };

  return (
    <ScreenWrapper>
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <MaterialIcons name="check-circle" size={56} color={colors.primary} />
        </View>
        <Text style={styles.title}>Order Completed!</Text>
        <Text style={styles.subtitle}>
          Your local commerce partner has successfully received your order.
        </Text>
        <View style={styles.orderIdBox}>
          <Text style={styles.orderIdLabel}>Order ID</Text>
          <Text style={styles.orderId}>{orderId ?? '—'}</Text>
        </View>
      </View>
      <View style={styles.footer}>
        <PrimaryButton label="Track Order" onPress={onTrackOrder} />
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
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
    marginBottom: 24,
  },
  orderIdBox: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.surfaceDark,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderDark,
  },
  orderIdLabel: { fontSize: 12, color: colors.textMuted, marginBottom: 4 },
  orderId: { fontSize: 14, fontWeight: '600', color: colors.textPrimary, fontFamily: 'monospace' },
  footer: { paddingVertical: 24 },
});
