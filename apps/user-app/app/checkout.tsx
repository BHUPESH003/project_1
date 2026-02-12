/**
 * Checkout screen – cart summary, delivery partner selection, payment method
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { useCartStore } from '@/store/cart.store';

// Demo delivery partners
const DELIVERY_PARTNERS = [
  {
    id: 'porter',
    name: 'Porter',
    label: 'QUICKEST',
    time: '15-20 mins',
    type: 'Direct',
    fee: 120,
    logo: 'https://images.unsplash.com/photo-1605378122142-98e5dba7214d?auto=format&fit=crop&w=50&q=80',
  },
  {
    id: 'dunzo',
    name: 'Dunzo',
    time: '22 mins',
    type: 'Multi-stop',
    fee: 95,
    logo: 'https://images.unsplash.com/photo-1578274455163-6d0d38d3364b?auto=format&fit=crop&w=50&q=80',
  },
];

export default function CheckoutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const cartItems = useCartStore((state) => state.items);
  const selectedSellerId = useCartStore((state) => state.selectedSellerId);
  const selectedShopName = useCartStore((state) => state.selectedShopName);
  const selectedProvider = useCartStore((state) => state.selectedDeliveryProvider);
  const paymentMethod = useCartStore((state) => state.paymentMethod);
  const subtotal = useCartStore((state) => state.getSubtotal());
  
  const setDeliveryProvider = useCartStore((state) => state.setDeliveryProvider);
  const setDeliveryFee = useCartStore((state) => state.setDeliveryFee);
  const setPaymentMethod = useCartStore((state) => state.setPaymentMethod);

  const selectedPartner = DELIVERY_PARTNERS.find(p => p.id === selectedProvider);
  const deliveryFee = selectedPartner?.fee || 0;
  const total = paymentMethod === 'postpay' ? subtotal : subtotal + deliveryFee;

  const handleSelectProvider = (provider: typeof DELIVERY_PARTNERS[0]) => {
    setDeliveryProvider(provider.id);
    setDeliveryFee(provider.fee);
  };

  const handlePaymentConfirm = () => {
    if (selectedProvider && paymentMethod) {
      // Navigate to payment selection page
      router.push('/payment-selection');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundDark }}>
      <View style={{ flex: 1, backgroundColor: colors.backgroundDark }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Checkout</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: spacing.xl + insets.bottom }}
          showsVerticalScrollIndicator={false}
        >
          {/* Shop & Items Summary */}
          <View style={styles.section}>
            <View style={styles.shopHeader}>
              <View>
                <Text style={styles.shopLabel}>FROM</Text>
                <Text style={styles.shopName}>{selectedShopName || 'Your Shop'}</Text>
              </View>
              <MaterialIcons name="store" size={32} color={colors.primary} />
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>ITEMS ({cartItems.length})</Text>
              <TouchableOpacity onPress={() => router.back()}>
                <Text style={styles.editText}>Edit</Text>
              </TouchableOpacity>
            </View>

            {cartItems.map((item) => (
              <View key={item.id} style={styles.cartItem}>
                <Image
                  source={{ uri: item.image || 'https://via.placeholder.com/60' }}
                  style={styles.itemImage}
                />
                <View style={styles.itemContent}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemQty}>{item.quantity} Unit{item.quantity > 1 ? 's' : ''}</Text>
                </View>
                <Text style={styles.itemPrice}>
                  ₹{(item.totalPrice ? item.totalPrice * item.quantity : item.price * item.quantity).toFixed(2)}
                </Text>
              </View>
            ))}
          </View>

          {/* Delivery Partner Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>DELIVERY PARTNER</Text>
            {DELIVERY_PARTNERS.map((partner) => (
              <TouchableOpacity
                key={partner.id}
                style={[
                  styles.partnerCard,
                  selectedProvider === partner.id && styles.partnerCardSelected,
                ]}
                onPress={() => handleSelectProvider(partner)}
              >
                <View style={styles.partnerIconWrap}>
                  <MaterialIcons name="local-shipping" size={28} color={colors.primary} />
                </View>
                <View style={styles.partnerContent}>
                  <View style={styles.partnerNameRow}>
                    <Text style={styles.partnerName}>{partner.name}</Text>
                    {partner.label && <Text style={styles.partnerLabel}>{partner.label}</Text>}
                  </View>
                  <Text style={styles.partnerTime}>{partner.time} • {partner.type}</Text>
                </View>
                <View style={styles.partnerFeeWrap}>
                  <Text style={styles.partnerFee}>₹{partner.fee}</Text>
                  <View
                    style={[
                      styles.partnerRadio,
                      selectedProvider === partner.id && styles.partnerRadioSelected,
                    ]}
                  >
                    {selectedProvider === partner.id && (
                      <View style={styles.partnerRadioInner} />
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Delivery Payment */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>DELIVERY PAYMENT</Text>
            
            <TouchableOpacity
              style={[
                styles.paymentOption,
                paymentMethod === 'prepay' && styles.paymentOptionSelected,
              ]}
              onPress={() => setPaymentMethod('prepay')}
            >
              <View style={styles.paymentRadioWrap}>
                <View
                  style={[
                    styles.paymentRadio,
                    paymentMethod === 'prepay' && styles.paymentRadioSelected,
                  ]}
                >
                  {paymentMethod === 'prepay' && (
                    <View style={styles.paymentRadioInner} />
                  )}
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.paymentTitle}>Prepay with Order</Text>
                <Text style={styles.paymentDesc}>Delivery fee is added to your checkout total</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.paymentOption,
                paymentMethod === 'postpay' && styles.paymentOptionSelected,
              ]}
              onPress={() => setPaymentMethod('postpay')}
            >
              <View style={styles.paymentRadioWrap}>
                <View
                  style={[
                    styles.paymentRadio,
                    paymentMethod === 'postpay' && styles.paymentRadioSelected,
                  ]}
                >
                  {paymentMethod === 'postpay' && (
                    <View style={styles.paymentRadioInner} />
                  )}
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.paymentTitle}>Pay After Delivery</Text>
                <Text style={styles.paymentDesc}>Pay fee directly to partner upon arrival</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Shipping Address */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>SHIPPING TO</Text>
              <TouchableOpacity>
                <Text style={styles.changeText}>Change</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.addressBox}>
              <MaterialIcons name="location-on" size={20} color={colors.primary} />
              <View style={{ flex: 1, marginLeft: spacing.sm }}>
                <Text style={styles.addressLabel}>Home • HSR Layout, Sector 4</Text>
              </View>
            </View>
          </View>

          {/* Pricing Breakdown */}
          <View style={styles.section}>
            <View style={styles.pricingRow}>
              <Text style={styles.pricingLabel}>Items Subtotal</Text>
              <Text style={styles.pricingValue}>₹{subtotal.toFixed(2)}</Text>
            </View>
            <View style={styles.pricingRow}>
              <Text style={styles.pricingLabel}>Delivery ({selectedPartner?.name || 'Partner'})</Text>
              <Text style={styles.pricingValue}>
                {selectedPartner ? (
                  paymentMethod === 'postpay' ? 'Payable at delivery' : `+₹${deliveryFee.toFixed(2)}`
                ) : '—'}
              </Text>
            </View>
            <View style={[styles.pricingRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Final Total</Text>
              <Text style={styles.totalValue}>₹{total.toFixed(2)}</Text>
            </View>
          </View>
        </ScrollView>

        {/* Confirm Button */}
        <View style={[styles.footer, { paddingBottom: spacing.md + insets.bottom }]}>
          <TouchableOpacity
            style={[
              styles.confirmBtn,
              (!selectedProvider || !paymentMethod) && styles.confirmBtnDisabled,
            ]}
            onPress={handlePaymentConfirm}
            disabled={!selectedProvider || !paymentMethod}
          >
            <Text style={styles.confirmBtnText}>Pay & Confirm Order</Text>
            <MaterialIcons name="arrow-forward" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  shopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primaryTint,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
  },
  shopLabel: {
    ...typography.meta,
    color: colors.textMuted,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  shopName: {
    ...typography.screenTitle,
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginTop: spacing.xxs,
  },
  section: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDark,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.meta,
    color: colors.textMuted,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  editText: {
    ...typography.secondary,
    color: colors.primary,
    fontWeight: '600',
  },
  changeText: {
    ...typography.meta,
    color: colors.primary,
    fontWeight: '600',
  },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceDark,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderDark,
  },
  itemImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: colors.background,
  },
  itemContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  itemName: {
    ...typography.secondary,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  itemQty: {
    ...typography.meta,
    color: colors.textMuted,
    marginTop: spacing.xxs,
  },
  itemPrice: {
    ...typography.secondary,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  partnerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceDark,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: colors.borderDark,
  },
  partnerCardSelected: {
    borderColor: colors.primary,
  },
  partnerIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: colors.primaryTint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  partnerContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  partnerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  partnerName: {
    ...typography.secondary,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  partnerLabel: {
    ...typography.overline,
    color: colors.primary,
    fontWeight: '700',
  },
  partnerTime: {
    ...typography.meta,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
  partnerFeeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  partnerFee: {
    ...typography.secondary,
    fontWeight: '700',
    color: colors.primary,
  },
  partnerRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.textMuted,
  },
  partnerRadioSelected: {
    borderColor: colors.primary,
  },
  partnerRadioInner: {
    flex: 1,
    borderRadius: 8,
    backgroundColor: colors.primary,
    margin: 2,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceDark,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: colors.borderDark,
  },
  paymentOptionSelected: {
    borderColor: colors.primary,
  },
  paymentRadioWrap: {
    marginRight: spacing.md,
  },
  paymentRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.textMuted,
  },
  paymentRadioSelected: {
    borderColor: colors.primary,
  },
  paymentRadioInner: {
    flex: 1,
    borderRadius: 8,
    backgroundColor: colors.primary,
    margin: 2,
  },
  paymentTitle: {
    ...typography.secondary,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  paymentDesc: {
    ...typography.meta,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
  addressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryTint,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
  },
  addressLabel: {
    ...typography.secondary,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  totalRow: {
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderDark,
    marginBottom: 0,
  },
  pricingLabel: {
    ...typography.secondary,
    color: colors.textSecondary,
  },
  pricingValue: {
    ...typography.secondary,
    fontWeight: '600',
    color: colors.primary,
  },
  totalLabel: {
    ...typography.secondary,
    fontWeight: '700',
    color: colors.textPrimary,
    fontSize: 16,
  },
  totalValue: {
    ...typography.secondary,
    fontWeight: '700',
    color: colors.textPrimary,
    fontSize: 18,
  },
  footer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    backgroundColor: colors.backgroundDark,
    borderTopWidth: 1,
    borderTopColor: colors.borderDark,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  confirmBtnDisabled: {
    opacity: 0.5,
  },
  confirmBtnText: {
    ...typography.secondary,
    fontWeight: '700',
    color: colors.textPrimary,
    fontSize: 16,
  },
});
