/**
 * Payment Screen – Step 3/3
 *
 * Order summary, UPI payment grid, saved cards, net banking,
 * and sticky "Pay Now" CTA.
 *
 * Visual source: stitch/checkout_flow/payment
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useCheckoutStore, type PaymentMethod } from '@/store/checkout.store';
import { useMultiCartStore } from '@/store/multiCartStore';
import { multiCartOrdersApi } from '@/api/multiCartOrders.api';
import { paymentsApi } from '@/api/payments.api';
import { showToast } from '@/lib/toast';
import RazorpayCheckout from 'react-native-razorpay';

// ── Design Tokens ────────────────────────────────
const C = {
  bg: '#0b0f0f',
  slate900: '#111827',
  slate800: '#1e293b',
  slate700: '#334155',
  slate600: '#475569',
  slate500: '#64748b',
  slate400: '#94a3b8',
  slate300: '#cbd5e1',
  slate200: '#e2e8f0',
  slate100: '#f1f5f9',
  teal900_30: 'rgba(19, 78, 74, 0.3)',
  teal900: '#134e4a',
  teal800: '#115e59',
  teal700: '#0f766e',
  teal600: '#0d9488',
  teal500: '#14b8a6',
  teal400: '#2dd4bf',
  teal300: '#5eead4',
  white: '#ffffff',
} as const;

interface UPIOption {
  id: PaymentMethod;
  label: string;
  icon: string;
}

const UPI_OPTIONS: UPIOption[] = [
  { id: 'UPI_PHONEPE', label: 'PhonePe', icon: 'account-balance-wallet' },
  { id: 'UPI_GPAY', label: 'GPay', icon: 'g-translate' },
  { id: 'UPI_PAYTM', label: 'Paytm', icon: 'qr-code-2' },
];

export default function PaymentScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const sellers = useCheckoutStore((s) => s.sellers);
  const orders = useCheckoutStore((s) => s.orders);
  const itemTotal = useCheckoutStore((s) => s.itemTotal);
  const deliveryTotal = useCheckoutStore((s) => s.deliveryTotal);
  const grandTotal = useCheckoutStore((s) => s.grandTotal);
  const taxesAndFees = useCheckoutStore((s) => s.taxesAndFees);
  const serviceFee = useCheckoutStore((s) => s.serviceFee);
  const selectedPaymentMethod = useCheckoutStore((s) => s.selectedPaymentMethod);
  const selectPaymentMethod = useCheckoutStore((s) => s.selectPaymentMethod);
  const setStep = useCheckoutStore((s) => s.setStep);
  const clearCheckoutState = useMultiCartStore((s) => s.clearCheckoutState);
  const checkoutReset = useCheckoutStore((s) => s.reset);

  const [paying, setPaying] = useState(false);

  const handlePay = useCallback(async () => {
    if (!selectedPaymentMethod) {
      showToast({ type: 'error', message: 'Please select a payment method', duration: 2000 });
      return;
    }

    setPaying(true);
    try {
      // Confirm all orders with delivery selections
      const deliveryConfirmations = sellers.map((seller) => {
        const selectedOpt = seller.deliveryOptions.find(
          (o) => o.id === seller.selectedDeliveryOptionId,
        );
        const matchingOrder = orders.find((o) => o.sellerId === seller.sellerId);
        return {
          orderId: matchingOrder?.orderId ?? '',
          sellerId: seller.sellerId,
          deliveryPartner: selectedOpt?.provider ?? '',
          deliveryFee: selectedOpt?.estimatedFee ?? 0,
        };
      });

      const confirmResponse = await multiCartOrdersApi.confirmMultipleOrders({
        deliveryConfirmations,
        paymentMethod: 'UPI',
      });

      if (!confirmResponse.success) {
        throw new Error('Failed to confirm orders');
      }

      // Create payment intent for first confirmed order (combined payment)
      const primaryOrder = confirmResponse.confirmedOrders[0];
      if (primaryOrder) {
        try {
          const paymentIntent = await paymentsApi.createPaymentIntent(primaryOrder.orderId);

          // Launch Razorpay
          const options = {
            description: `Order payment - ${sellers.map((s) => s.sellerName).join(', ')}`,
            currency: paymentIntent.payment_intent?.currency ?? 'INR',
            key: process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID ?? '',
            amount: (paymentIntent.payment_intent?.amount ?? grandTotal) * 100,
            order_id: paymentIntent.payment_intent?.gatewayOrderId ?? '',
            name: 'The Neighborhood App',
            prefill: {
              method: 'upi',
            },
            theme: { color: C.teal600 },
          };

          let data;
          const isRazorpayModuleAvailable = !!(RazorpayCheckout && typeof RazorpayCheckout.open === 'function');
          
          console.log('[Payment] Razorpay Availability:', isRazorpayModuleAvailable);

          if (isRazorpayModuleAvailable) {
            data = await RazorpayCheckout.open(options);
          } else {
            console.log('[Payment] Entering Simulation Mode...');
            // Simulation Mode for Expo Go/Web or missing module
            const simulateSuccess = await new Promise((resolve) => {
              Alert.alert(
                'Payment Simulation',
                'The Razorpay native module is not available in this environment. Would you like to simulate a successful payment?',
                [
                  { text: 'Cancel', onPress: () => resolve(false), style: 'cancel' },
                  { text: 'Simulate Success', onPress: () => resolve(true) },
                ]
              );
            });

            if (!simulateSuccess) throw new Error('Payment cancelled');
            
            // Mock response
            data = {
              razorpay_payment_id: 'pay_sim_' + Math.random().toString(36).substring(7),
              razorpay_order_id: options.order_id,
              razorpay_signature: 'sig_sim_' + Math.random().toString(36).substring(7),
            };
          }

          // Verify payment
          await paymentsApi.verifyPayment(primaryOrder.orderId, {
            razorpay_payment_id: data.razorpay_payment_id,
            razorpay_order_id: data.razorpay_order_id,
            razorpay_signature: data.razorpay_signature,
          });

          // Success
          const sellerIds = sellers.map((s) => s.sellerId);
          clearCheckoutState(sellerIds);
          setStep('success');
          router.replace('/(root)/checkout-success');
        } catch (payErr: any) {
          // Payment failed or cancelled
          if (payErr.message !== 'Payment cancelled') {
            console.error('Payment failed:', payErr);
          }
          setStep('failure');
          router.replace('/(root)/checkout-failure');
        }
      }
    } catch (err: any) {
      console.error('Checkout error:', err);
      showToast({
        type: 'error',
        message: err?.message ?? 'Something went wrong',
        duration: 3000,
      });
      setStep('failure');
      router.replace('/(root)/checkout-failure');
    } finally {
      setPaying(false);
    }
  }, [selectedPaymentMethod, sellers, orders, grandTotal]);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* ── Header ──────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
            <MaterialIcons name="arrow-back" size={24} color={C.teal400} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Checkout</Text>
        </View>
        <View style={styles.stepPill}>
          <Text style={styles.stepText}>STEP 3/3</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 200 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Order Summary ─────────────────── */}
        <Text style={styles.sectionTitle}>Order Summary</Text>
        <View style={styles.summaryCard}>
          <View style={styles.summaryRows}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Items total</Text>
              <Text style={styles.summaryValue}>₹{itemTotal.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Delivery fee</Text>
              <Text style={styles.summaryValue}>₹{deliveryTotal.toFixed(2)}</Text>
            </View>
            {taxesAndFees > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Taxes & Fees</Text>
                <Text style={styles.summaryValue}>₹{taxesAndFees.toFixed(2)}</Text>
              </View>
            )}
            {serviceFee > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Service Fee</Text>
                <Text style={styles.summaryValue}>₹{serviceFee.toFixed(2)}</Text>
              </View>
            )}
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <Text style={styles.grandLabel}>Grand total</Text>
              <Text style={styles.grandValue}>₹{grandTotal.toFixed(2)}</Text>
            </View>
          </View>
          <View style={styles.secureBanner}>
            <MaterialIcons name="verified" size={16} color={C.teal400} />
            <Text style={styles.secureBannerText}>
              GUARANTEED SECURE TRANSACTION
            </Text>
          </View>
        </View>

        {/* ── UPI Payments ──────────────────── */}
        <View style={styles.upiHeader}>
          <Text style={styles.sectionTitle}>UPI Payments</Text>
          <Text style={styles.recommendedBadge}>RECOMMENDED</Text>
        </View>
        <View style={styles.upiGrid}>
          {UPI_OPTIONS.map((upi) => {
            const isSelected = selectedPaymentMethod === upi.id;
            return (
              <TouchableOpacity
                key={upi.id}
                style={[
                  styles.upiCard,
                  isSelected && styles.upiCardSelected,
                ]}
                activeOpacity={0.7}
                onPress={() => selectPaymentMethod(upi.id)}
              >
                {isSelected && (
                  <View style={styles.upiCheck}>
                    <MaterialIcons name="check-circle" size={14} color={C.teal400} />
                  </View>
                )}
                <View
                  style={[
                    styles.upiIconCircle,
                    isSelected && styles.upiIconCircleSelected,
                  ]}
                >
                  <MaterialIcons
                    name={upi.icon as any}
                    size={24}
                    color={isSelected ? C.teal400 : C.slate100}
                  />
                </View>
                <Text
                  style={[
                    styles.upiLabel,
                    isSelected && styles.upiLabelSelected,
                  ]}
                >
                  {upi.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Other Methods ─────────────────── */}
        <Text style={[styles.sectionTitle, { marginTop: 32 }]}>
          Other Methods
        </Text>
        <View style={styles.methodsList}>
          {/* Saved Card */}
          <TouchableOpacity
            style={styles.methodRow}
            onPress={() => selectPaymentMethod('CARD')}
          >
            <View style={styles.methodLeft}>
              <View style={styles.methodIcon}>
                <MaterialIcons
                  name="credit-card"
                  size={24}
                  color={selectedPaymentMethod === 'CARD' ? C.teal400 : C.slate400}
                />
              </View>
              <View>
                <Text style={styles.methodName}>HDFC Bank Debit Card</Text>
                <Text style={styles.methodDetail}>XXXX XXXX 4290</Text>
              </View>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={C.slate600} />
          </TouchableOpacity>

          <View style={styles.methodDivider} />

          {/* Net Banking */}
          <TouchableOpacity
            style={styles.methodRow}
            onPress={() => selectPaymentMethod('NET_BANKING')}
          >
            <View style={styles.methodLeft}>
              <View style={styles.methodIcon}>
                <MaterialIcons
                  name="account-balance"
                  size={24}
                  color={selectedPaymentMethod === 'NET_BANKING' ? C.teal400 : C.slate400}
                />
              </View>
              <View>
                <Text style={styles.methodName}>Net Banking</Text>
                <Text style={styles.methodDetail}>Choose from all Indian banks</Text>
              </View>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={C.slate600} />
          </TouchableOpacity>

          <View style={styles.methodDivider} />

          {/* Add new card */}
          <TouchableOpacity style={styles.methodRow}>
            <View style={styles.methodLeft}>
              <View style={styles.methodIconDashed}>
                <MaterialIcons name="add" size={24} color={C.slate500} />
              </View>
              <Text style={styles.methodAddText}>
                Add new credit/debit card
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* ── Security Badge ───────────────── */}
        <View style={styles.securitySection}>
          <View style={styles.securityRow}>
            <MaterialIcons name="lock" size={16} color={C.slate400} />
            <Text style={styles.securityLabel}>PCI-DSS COMPLIANT</Text>
          </View>
          <Text style={styles.securityDetail}>
            Your transaction is secured with 256-bit encryption for maximum
            safety.
          </Text>
        </View>
      </ScrollView>

      {/* ── Sticky Footer ──────────────────── */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) + 24 }]}>
        <View style={styles.footerInner}>
          <View>
            <Text style={styles.footerLabel}>PAYING TOTAL</Text>
            <Text style={styles.footerAmount}>₹{grandTotal.toFixed(2)}</Text>
          </View>
          <TouchableOpacity
            style={[styles.payButton, paying && { opacity: 0.6 }]}
            activeOpacity={0.85}
            onPress={handlePay}
            disabled={paying}
          >
            <LinearGradient
              colors={[C.teal600, C.teal800]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.payGradient}
            >
              {paying ? (
                <ActivityIndicator color={C.white} size="small" />
              ) : (
                <>
                  <Text style={styles.payText}>Pay Now</Text>
                  <MaterialIcons name="arrow-forward" size={18} color={C.white} />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: 'rgba(17, 24, 39, 0.8)',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  backBtn: { padding: 8, borderRadius: 999 },
  headerTitle: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: C.teal400,
  },
  stepPill: {
    backgroundColor: C.teal900_30,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.2)',
  },
  stepText: {
    fontSize: 12,
    fontWeight: '700',
    color: C.teal400,
    letterSpacing: 0.5,
  },

  // Scroll
  scrollArea: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 24 },

  // Section
  sectionTitle: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 20,
    fontWeight: '800',
    color: C.teal300,
    marginBottom: 16,
    marginLeft: 4,
    letterSpacing: -0.5,
  },

  // Summary card
  summaryCard: {
    backgroundColor: C.slate900,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.slate800,
    marginBottom: 32,
  },
  summaryRows: { padding: 20, gap: 12 },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: { fontSize: 14, color: C.slate400 },
  summaryValue: { fontSize: 14, fontWeight: '500', color: C.slate200 },
  summaryDivider: {
    height: 1,
    backgroundColor: C.slate800,
    marginTop: 4,
  },
  grandLabel: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 18,
    fontWeight: '700',
    color: C.slate100,
    marginTop: 4,
  },
  grandValue: {
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontSize: 20,
    fontWeight: '800',
    color: C.teal400,
    marginTop: 4,
  },
  secureBanner: {
    backgroundColor: C.teal900_30,
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  secureBannerText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: C.teal500,
    textTransform: 'uppercase',
  },

  // UPI
  upiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 16,
    marginLeft: 4,
  },
  recommendedBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: C.teal500,
    marginBottom: 16,
  },
  upiGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  upiCard: {
    flex: 1,
    backgroundColor: C.slate900,
    borderWidth: 1,
    borderColor: C.slate800,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  upiCardSelected: {
    borderColor: 'rgba(20, 184, 166, 0.5)',
  },
  upiCheck: {
    position: 'absolute',
    top: 4,
    right: 4,
    padding: 4,
  },
  upiIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: C.slate800,
    justifyContent: 'center',
    alignItems: 'center',
  },
  upiIconCircleSelected: {
    backgroundColor: C.teal900_30,
  },
  upiLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: C.slate300,
  },
  upiLabelSelected: {
    color: C.slate100,
  },

  // Other methods
  methodsList: {
    backgroundColor: C.slate900,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.slate800,
    overflow: 'hidden',
  },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  methodLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  methodIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: C.slate800,
    justifyContent: 'center',
    alignItems: 'center',
  },
  methodIconDashed: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: C.slate700,
    justifyContent: 'center',
    alignItems: 'center',
  },
  methodName: { fontSize: 14, fontWeight: '600', color: C.slate200 },
  methodDetail: { fontSize: 12, color: C.slate500, marginTop: 2 },
  methodAddText: {
    fontSize: 14,
    fontWeight: '600',
    color: C.slate400,
  },
  methodDivider: { height: 1, backgroundColor: C.slate800 },

  // Security
  securitySection: {
    alignItems: 'center',
    paddingVertical: 24,
    opacity: 0.6,
    gap: 8,
  },
  securityRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  securityLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: C.slate400,
    textTransform: 'uppercase',
  },
  securityDetail: {
    fontSize: 10,
    color: C.slate500,
    textAlign: 'center',
    maxWidth: 200,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(17, 24, 39, 0.9)',
    borderTopWidth: 1,
    borderTopColor: C.slate800,
  },
  footerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 24,
    gap: 16,
  },
  footerLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: C.slate500,
    textTransform: 'uppercase',
  },
  footerAmount: {
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontSize: 24,
    fontWeight: '800',
    color: C.slate100,
    lineHeight: 28,
  },
  payButton: {
    borderRadius: 999,
    overflow: 'hidden',
  },
  payGradient: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
  },
  payText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 16,
    fontWeight: '700',
    color: C.white,
  },
});
