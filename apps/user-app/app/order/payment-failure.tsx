/**
 * Payment failure – Retry (payment-method) / Cancel (home).
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { PrimaryButton } from '@/components/PrimaryButton';
import { colors } from '@/constants/colors';
import { useOrderDraftStore } from '@/store/order-draft.store';

export default function PaymentFailureScreen() {
  const router = useRouter();
  const orderId = useOrderDraftStore((s) => s.orderId);

  const onRetry = () => router.push('/order/payment-method');
  const onCancel = () => router.replace('/(tabs)/home');

  return (
    <ScreenWrapper>
      <View style={styles.header}>
        <View style={styles.placeholder} />
        <Text style={styles.title}>Payment Failed</Text>
        <View style={styles.placeholder} />
      </View>
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <MaterialIcons name="gpp-bad" size={48} color={colors.error} />
        </View>
        <Text style={styles.heading}>Payment was unsuccessful</Text>
        <Text style={styles.message}>
          We couldn't process your payment. No money was deducted from your account.
        </Text>
        <View style={styles.hintBox}>
          <MaterialIcons name="info" size={16} color={colors.textSecondary} />
          <Text style={styles.hintText}>Check your internet or payment method</Text>
        </View>
      </View>
      <View style={styles.footer}>
        <PrimaryButton label="Retry Payment" onPress={onRetry} icon={<MaterialIcons name="refresh" size={20} color={colors.textPrimary} />} />
        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDark,
  },
  placeholder: { width: 40 },
  title: { flex: 1, fontSize: 18, fontWeight: '700', color: colors.textPrimary, textAlign: 'center' },
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
    backgroundColor: colors.errorBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  heading: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 300,
    lineHeight: 24,
    marginBottom: 24,
  },
  hintBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.surfaceDark,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderDark,
  },
  hintText: { fontSize: 12, fontWeight: '500', color: colors.textSecondary },
  footer: {
    paddingVertical: 24,
    gap: 12,
  },
  cancelBtn: { paddingVertical: 12, alignItems: 'center' },
  cancelText: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
});
