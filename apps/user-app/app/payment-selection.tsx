/**
 * Payment Selection – Choose between UPI, Cards, QR code
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeColors, useThemedStyles } from '@/theme';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { useCartStore } from '@/store/cart.store';

interface PaymentMethod {
  id: 'upi' | 'card' | 'qr';
  name: string;
  description: string;
  icon: string;
}

const PAYMENT_METHODS: Array<{ id: 'upi' | 'card' | 'qr'; name: string; description: string; icon: React.ComponentProps<typeof MaterialIcons>['name'] }> = [
  {
    id: 'upi',
    name: 'UPI',
    description: 'Pay using Google Pay, PhonePe, PayTM',
    icon: 'account-balance-wallet' as any,
  },
  {
    id: 'card',
    name: 'Debit / Credit Card',
    description: 'Visa, Mastercard, Rupay',
    icon: 'credit-card' as any,
  },
  {
    id: 'qr',
    name: 'QR Code',
    description: 'Scan with any UPI app',
    icon: 'qr-code' as any,
  },
];

export default function PaymentSelectionScreen() {
  const colors = useThemeColors();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const getTotal = useCartStore((state) => state.getTotal);
  const cartItems = useCartStore((state) => state.items);

  const handleProceedToPayment = async () => {
    if (!selectedMethod) {
      Alert.alert('Select Payment Method', 'Please select a payment method to proceed');
      return;
    }

    if (cartItems.length === 0) {
      Alert.alert('Empty Cart', 'Please add items before proceeding to payment');
      return;
    }

    setLoading(true);
    
    // Simulate order creation and payment processing
    setTimeout(() => {
      setLoading(false);
      // Navigate to payment processing page with payment method
      router.push({
        pathname: '/order/payment-processing',
        params: { 
          method: selectedMethod,
          amount: getTotal().toFixed(2),
          itemCount: cartItems.length,
        },
      });
    }, 800);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundDark }}>
      <View style={{ flex: 1, backgroundColor: colors.backgroundDark }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Select Payment Method</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: spacing.xl + insets.bottom }}
          showsVerticalScrollIndicator={false}
        >
          {/* Payment Amount Summary */}
          <View style={styles.amountSummary}>
            <Text style={styles.amountLabel}>TOTAL AMOUNT TO PAY</Text>
            <Text style={styles.amountValue}>₹{getTotal().toFixed(2)}</Text>
            <Text style={styles.itemsCount}>{cartItems.length} item{cartItems.length !== 1 ? 's' : ''}</Text>
          </View>

          {/* Info Box */}
          <View style={styles.infoBox}>
            <MaterialIcons name="info" size={20} color={colors.primary} />
            <Text style={styles.infoText}>
              Choose your preferred payment method to complete your order securely
            </Text>
          </View>

          {/* Payment Methods */}
          <View style={styles.methodsContainer}>
            {PAYMENT_METHODS.map((method) => (
              <TouchableOpacity
                key={method.id}
                style={[
                  styles.methodCard,
                  selectedMethod === method.id && styles.methodCardSelected,
                ]}
                onPress={() => setSelectedMethod(method.id)}
              >
                <View style={styles.methodContent}>
                  <View style={styles.methodIconBox}>
                    <MaterialIcons
                      name={method.icon}
                      size={28}
                      color={selectedMethod === method.id ? colors.primary : colors.textMuted}
                    />
                  </View>
                  <View style={styles.methodInfo}>
                    <Text style={styles.methodName}>{method.name}</Text>
                    <Text style={styles.methodDesc}>{method.description}</Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.radio,
                    selectedMethod === method.id && styles.radioSelected,
                  ]}
                >
                  {selectedMethod === method.id && (
                    <View style={styles.radioDot} />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Security Note */}
          <View style={styles.securityBox}>
            <MaterialIcons name="lock" size={16} color={colors.primary} />
            <Text style={styles.securityText}>
              Your payment is secured with 256-bit encryption
            </Text>
          </View>
        </ScrollView>

        {/* Footer Button */}
        <View style={[styles.footer, { paddingBottom: spacing.md + insets.bottom }]}>
          <TouchableOpacity
            style={[
              styles.proceedBtn,
              (!selectedMethod || loading) && styles.proceedBtnDisabled,
            ]}
            onPress={handleProceedToPayment}
            disabled={!selectedMethod || loading}
          >
            <Text style={styles.proceedBtnText}>
              {loading ? 'Processing...' : 'Proceed to Payment'}
            </Text>
            {!loading && <MaterialIcons name="arrow-forward" size={20} color={colors.textPrimary} />}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDark,
  },
  headerTitle: {
    ...typography.screenTitle,
    color: colors.textPrimary,
    fontSize: 20,
  },
  scroll: {
    flex: 1,
  },
  amountSummary: {
    backgroundColor: colors.primaryTint,
    borderRadius: 12,
    padding: spacing.lg,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'colors.primaryLight',
  },
  amountLabel: {
    ...typography.meta,
    color: colors.textMuted,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  amountValue: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.primary,
    marginVertical: spacing.sm,
  },
  itemsCount: {
    ...typography.meta,
    color: colors.textSecondary,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: colors.primaryTint,
    borderRadius: 12,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: 'colors.primaryLight',
  },
  infoText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },
  methodsContainer: {
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceDark,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: colors.borderDark,
  },
  methodCardSelected: {
    borderColor: colors.primary,
    backgroundColor: 'colors.primaryLight',
  },
  methodContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  methodIconBox: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  methodInfo: {
    flex: 1,
  },
  methodName: {
    ...typography.primary,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    fontWeight: '700' as const,
  },
  methodDesc: {
    ...typography.meta,
    color: colors.textMuted,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.borderDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.textPrimary,
  },
  securityBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    marginTop: spacing.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.surfaceDark,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderDark,
  },
  securityText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 12,
  },
  footer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  proceedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  proceedBtnDisabled: {
    opacity: 0.5,
  },
  proceedBtnText: {
    ...typography.primary,
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700' as const,
  },
});
