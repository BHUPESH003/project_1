import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { type NativeStackScreenProps } from '@react-navigation/native-stack';
import RazorpayCheckout from 'react-native-razorpay';
import { useColors } from '@/theme';
import { spacing, radius } from '@/theme/spacing';
import { fontSize, fontWeight } from '@/theme/typography';
import { useAddressStore } from '@/stores/addressStore';
import { useCartStore } from '@/stores/cartStore';
import {
  useCheckoutSummary,
  usePlaceOrder,
  useCreatePaymentIntent,
  useVerifyPayment,
} from '@/api/hooks/useCheckout';
import { useAddresses } from '@/api/hooks/useAddresses';
import { showToast } from '@/stores/toastStore';
import { Skeleton } from '@/components/ui/Skeleton';
import type { HomeStackParamList } from '@/navigation/HomeStack';
import type { DeliveryQuote, CheckoutSellerGroup } from '@/api/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'Checkout'>;

export function CheckoutScreen({ navigation }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const { selectedAddress } = useAddressStore();
  const { data: savedAddresses } = useAddresses();
  const clearCart = useCartStore((s) => s.clear);

  // Find address ID from saved addresses by matching lat/lng
  const addressId = savedAddresses?.find(
    (a) =>
      selectedAddress &&
      Math.abs(a.lat - selectedAddress.lat) < 0.0001 &&
      Math.abs(a.lng - selectedAddress.lng) < 0.0001,
  )?.id;

  const { data: summary, isLoading } = useCheckoutSummary(addressId);
  const placeOrder = usePlaceOrder();
  const createPaymentIntent = useCreatePaymentIntent();
  const verifyPayment = useVerifyPayment();

  // Track selected delivery quote per seller
  const [selectedDelivery, setSelectedDelivery] = useState<
    Record<string, string>
  >({});

  const allDeliverySelected =
    summary != null &&
    summary.sellers.every((s) => Boolean(selectedDelivery[s.sellerId]));

  const [isPaying, setIsPaying] = useState(false);

  const totalItems = summary?.itemTotal ?? 0;

  async function handlePay() {
    if (!summary || !addressId || !allDeliverySelected) return;
    setIsPaying(true);

    try {
      // 1. Place order
      const { orders } = await placeOrder.mutateAsync({
        deliveryAddressId: addressId,
        sellerDeliveryChoices: Object.entries(selectedDelivery).map(
          ([sellerId, deliveryQuoteId]) => ({ sellerId, deliveryQuoteId }),
        ),
      });

      const orderIds = orders.map((o) => o.id);

      // 2. For each order create payment intent + open Razorpay
      for (const order of orders) {
        const intent = await createPaymentIntent.mutateAsync(order.id);

        const options = {
          description: `Order from ${order.sellerName}`,
          currency: intent.currency,
          key: intent.keyId,
          amount: intent.amount,
          name: 'LocalApp',
          order_id: intent.razorpayOrderId,
          prefill: {
            method: 'upi',
          },
          theme: { color: '#0b8a93' },
        };

        const paymentData = await RazorpayCheckout.open(options);

        await verifyPayment.mutateAsync({
          orderId: order.id,
          payload: {
            razorpayPaymentId: paymentData.razorpay_payment_id,
            razorpayOrderId: paymentData.razorpay_order_id,
            razorpaySignature: paymentData.razorpay_signature,
          },
        });
      }

      clearCart();
      navigation.replace('PaymentSuccess', { orderIds });
    } catch (err: unknown) {
      const errObj = err as { code?: string; description?: string };
      if (errObj?.code === 'PAYMENT_CANCELLED') {
        showToast({ type: 'info', message: 'Payment cancelled' });
      } else {
        navigation.navigate('PaymentFailure', {
          errorMessage: errObj?.description ?? 'Payment failed',
        });
      }
    } finally {
      setIsPaying(false);
    }
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + spacing.sm,
            backgroundColor: colors.bg,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Text style={[styles.backText, { color: colors.text }]}>←</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Checkout</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Delivery address */}
        <View style={[styles.addressCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.addressHeader}>
            <Text style={styles.addressIcon}>📍</Text>
            <Text style={[styles.addressLabel, { color: colors.text3 }]}>Delivering to</Text>
          </View>
          <Text style={[styles.addressText, { color: colors.text }]} numberOfLines={2}>
            {selectedAddress?.fullAddress ?? 'No address selected'}
          </Text>
        </View>

        {/* Per-seller sections */}
        {isLoading ? (
          <View style={styles.loadingArea}>
            <Skeleton width="100%" height={140} borderRadius={radius.lg} />
            <Skeleton width="100%" height={140} borderRadius={radius.lg} style={{ marginTop: spacing.md }} />
          </View>
        ) : !summary || summary.sellers.length === 0 ? (
          <View style={styles.noSummary}>
            <Text style={[styles.noSummaryText, { color: colors.text2 }]}>
              Could not load checkout details. Please try again.
            </Text>
          </View>
        ) : (
          summary.sellers.map((sellerGroup) => (
            <SellerCheckoutSection
              key={sellerGroup.sellerId}
              group={sellerGroup}
              selectedQuoteId={selectedDelivery[sellerGroup.sellerId]}
              onSelectQuote={(quoteId) =>
                setSelectedDelivery((prev) => ({
                  ...prev,
                  [sellerGroup.sellerId]: quoteId,
                }))
              }
              colors={colors}
            />
          ))
        )}

        {/* Order total */}
        {summary && (
          <View style={[styles.totalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: colors.text2 }]}>Items total</Text>
              <Text style={[styles.totalValue, { color: colors.text }]}>₹{totalItems}</Text>
            </View>
            <Text style={[styles.deliveryNote, { color: colors.text3 }]}>
              Delivery fees shown above are paid directly to the delivery partner
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Pay button */}
      <View
        style={[
          styles.payBar,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            paddingBottom: insets.bottom || spacing.lg,
          },
        ]}
      >
        <Pressable
          style={[
            styles.payBtn,
            {
              backgroundColor:
                allDeliverySelected && !isPaying ? colors.primary : colors.surface3,
            },
          ]}
          onPress={handlePay}
          disabled={!allDeliverySelected || isPaying}
        >
          {isPaying ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text
              style={[
                styles.payBtnText,
                {
                  color:
                    allDeliverySelected ? colors.textOnPrimary : colors.text3,
                },
              ]}
            >
              {allDeliverySelected
                ? `Pay ₹${totalItems}`
                : 'Select delivery for all shops'}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

// ─── Seller section with delivery options ─────────────────────────────────────

function SellerCheckoutSection({
  group,
  selectedQuoteId,
  onSelectQuote,
  colors,
}: {
  group: CheckoutSellerGroup;
  selectedQuoteId: string | undefined;
  onSelectQuote: (id: string) => void;
  colors: ReturnType<typeof useColors>;
}) {
  const [expanded, setExpanded] = useState(false);
  const itemCount = group.items.reduce((s, i) => s + i.quantity, 0);

  return (
    <View style={[styles.sellerSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {/* Seller header */}
      <Pressable
        style={[styles.sellerSectionHeader, { borderBottomColor: colors.borderFaint }]}
        onPress={() => setExpanded((v) => !v)}
      >
        <View style={[styles.sellerAvatar, { backgroundColor: colors.primarySoft }]}>
          <Text style={[styles.sellerAvatarText, { color: colors.primary }]}>
            {group.sellerName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.sellerInfo}>
          <Text style={[styles.sellerNameText, { color: colors.text }]}>{group.sellerName}</Text>
          <Text style={[styles.sellerMeta, { color: colors.text3 }]}>
            {itemCount} item{itemCount !== 1 ? 's' : ''} · ₹{group.subtotal}
          </Text>
        </View>
        <Text style={[styles.expandIcon, { color: colors.text3 }]}>
          {expanded ? '▲' : '▼'}
        </Text>
      </Pressable>

      {/* Collapsed item list */}
      {expanded &&
        group.items.map((item) => (
          <View
            key={item.id}
            style={[styles.itemPreview, { borderBottomColor: colors.borderFaint }]}
          >
            <Text style={[styles.itemPreviewName, { color: colors.text2 }]} numberOfLines={1}>
              {item.productName}
            </Text>
            <Text style={[styles.itemPreviewPrice, { color: colors.text }]}>
              ₹{item.price} × {item.quantity}
            </Text>
          </View>
        ))}

      {/* Delivery options */}
      <View style={styles.deliveryOptions}>
        <Text style={[styles.deliveryTitle, { color: colors.text2 }]}>Choose delivery</Text>
        {group.deliveryQuotes.length === 0 ? (
          <Text style={[styles.noDelivery, { color: colors.text3 }]}>
            No delivery options available
          </Text>
        ) : (
          group.deliveryQuotes.map((quote) => (
            <DeliveryQuoteCard
              key={quote.id}
              quote={quote}
              selected={quote.id === selectedQuoteId}
              onSelect={() => onSelectQuote(quote.id)}
              colors={colors}
            />
          ))
        )}
      </View>
    </View>
  );
}

function DeliveryQuoteCard({
  quote,
  selected,
  onSelect,
  colors,
}: {
  quote: DeliveryQuote;
  selected: boolean;
  onSelect: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <Pressable
      style={[
        styles.quoteCard,
        {
          borderColor: selected ? colors.primary : colors.border,
          backgroundColor: selected ? colors.primarySoft : colors.bg,
        },
      ]}
      onPress={onSelect}
    >
      {/* Radio */}
      <View
        style={[
          styles.radio,
          {
            borderColor: selected ? colors.primary : colors.border,
          },
        ]}
      >
        {selected && (
          <View style={[styles.radioDot, { backgroundColor: colors.primary }]} />
        )}
      </View>

      <View style={styles.quoteInfo}>
        <View style={styles.quoteRow}>
          <Text style={[styles.quoteProvider, { color: colors.text }]}>
            {quote.provider}
          </Text>
          <Text style={[styles.quoteEta, { color: colors.text3 }]}>
            {quote.eta}
          </Text>
        </View>

        <View style={styles.quoteBadges}>
          {quote.isRecommended && (
            <QuoteBadge label="Recommended" bg={colors.successSoft} text={colors.success} />
          )}
          {quote.isCheapest && (
            <QuoteBadge label="Cheapest" bg={colors.primarySoft} text={colors.primary} />
          )}
          {quote.isFastest && (
            <QuoteBadge label="Fastest" bg={colors.accentSoft} text={colors.accent} />
          )}
        </View>
      </View>

      <Text style={[styles.quotePrice, { color: colors.text }]}>
        {quote.price === 0 ? 'Free' : `₹${quote.price}`}
      </Text>
    </Pressable>
  );
}

function QuoteBadge({
  label,
  bg,
  text,
}: {
  label: string;
  bg: string;
  text: string;
}) {
  return (
    <View style={[styles.quoteBadge, { backgroundColor: bg }]}>
      <Text style={[styles.quoteBadgeText, { color: text }]}>{label}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing.md,
  },
  backText: { fontSize: 22, padding: spacing.xs },
  headerTitle: { flex: 1, fontSize: fontSize.display, fontWeight: fontWeight.bold, textAlign: 'center' },

  // Address
  addressCard: {
    margin: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.xs,
  },
  addressHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  addressIcon: { fontSize: 14 },
  addressLabel: { fontSize: fontSize.caption, fontWeight: fontWeight.semibold, textTransform: 'uppercase' },
  addressText: { fontSize: fontSize.body },

  loadingArea: { paddingHorizontal: spacing.lg, gap: spacing.md },
  noSummary: { padding: spacing['3xl'], alignItems: 'center' },
  noSummaryText: { fontSize: fontSize.body, textAlign: 'center' },

  // Seller section
  sellerSection: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  sellerSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sellerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sellerAvatarText: { fontSize: fontSize.subhead, fontWeight: fontWeight.bold },
  sellerInfo: { flex: 1 },
  sellerNameText: { fontSize: fontSize.body, fontWeight: fontWeight.bold },
  sellerMeta: { fontSize: fontSize.caption },
  expandIcon: { fontSize: 10 },

  itemPreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  itemPreviewName: { flex: 1, fontSize: fontSize.caption },
  itemPreviewPrice: { fontSize: fontSize.caption, fontWeight: fontWeight.semibold },

  deliveryOptions: { padding: spacing.md, gap: spacing.sm },
  deliveryTitle: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  noDelivery: { fontSize: fontSize.body, textAlign: 'center', padding: spacing.md },

  // Quote card
  quoteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: { width: 8, height: 8, borderRadius: 4 },
  quoteInfo: { flex: 1 },
  quoteRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  quoteProvider: { fontSize: fontSize.body, fontWeight: fontWeight.semibold },
  quoteEta: { fontSize: fontSize.caption },
  quoteBadges: { flexDirection: 'row', gap: 4, marginTop: 3 },
  quoteBadge: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 3 },
  quoteBadgeText: { fontSize: fontSize.micro ?? 10, fontWeight: fontWeight.semibold },
  quotePrice: { fontSize: fontSize.body, fontWeight: fontWeight.bold },

  // Total card
  totalCard: {
    margin: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.sm,
  },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between' },
  totalLabel: { fontSize: fontSize.body },
  totalValue: { fontSize: fontSize.body, fontWeight: fontWeight.bold },
  deliveryNote: { fontSize: fontSize.caption, lineHeight: 17 },

  // Pay bar
  payBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  payBtn: {
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  payBtnText: { fontSize: fontSize.body, fontWeight: fontWeight.bold },
});
