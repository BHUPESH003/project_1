/**
 * Checkout Success Screen
 *
 * Celebration state after successful multi-seller order payment.
 *
 * Visual source: stitch/checkout_flow/success
 */
import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useCheckoutStore } from '@/store/checkout.store';

// ── Design Tokens ────────────────────────────────
const C = {
  bg: '#0b0f0f',
  surface: '#1a1f1f',
  surfaceHigh: '#e4e9ea',
  slate900: '#111827',
  slate800: '#1e293b',
  slate500: '#64748b',
  slate400: '#94a3b8',
  onSurface: '#f1f4f4',
  onSurfaceVariant: '#596061',
  primary: '#006c5c',
  primaryDim: '#005e51',
  primaryContainer: '#61f4d8',
  outlineVariant10: 'rgba(172, 179, 180, 0.1)',
  white: '#ffffff',
} as const;

export default function CheckoutSuccessScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const sellers = useCheckoutStore((s) => s.sellers);
  const orders = useCheckoutStore((s) => s.orders);
  const reset = useCheckoutStore((s) => s.reset);

  // Generate a display order ID
  const orderDisplayId = orders[0]
    ? `#SHP-${orders[0].orderId.slice(-4).toUpperCase()}`
    : '#SHP-0000';

  const sellerNames = sellers.map((s) => s.sellerName);

  const handleTrackOrders = () => {
    reset();
    router.replace('/(tabs)/orders');
  };

  const handleContinueShopping = () => {
    reset();
    router.replace('/(tabs)');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* ── Header ──────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleContinueShopping}
          style={styles.backBtn}
        >
          <MaterialIcons name="arrow-back" size={24} color="#2dd4bf" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Celebration Icon ──────────────── */}
        <View style={styles.iconSection}>
          <View style={styles.iconGlow} />
          <View style={styles.iconCircle}>
            <MaterialIcons
              name="check-circle"
              size={72}
              color={C.primary}
            />
          </View>
        </View>

        {/* ── Message ──────────────────────────*/}
        <View style={styles.messageSection}>
          <Text style={styles.successHeading}>
            Order Placed{'\n'}Successfully!
          </Text>
          <Text style={styles.successSubtext}>
            Your orders for{' '}
            {sellerNames.map((name, i) => (
              <Text key={name}>
                <Text style={styles.sellerHighlight}>{name}</Text>
                {i < sellerNames.length - 1
                  ? i === sellerNames.length - 2
                    ? ' and '
                    : ', '
                  : ''}
              </Text>
            ))}{' '}
            are being prepared.
          </Text>
        </View>

        {/* ── Order Details Bento Card ─────── */}
        <View style={styles.bentoCard}>
          <View style={styles.bentoHeader}>
            <View>
              <Text style={styles.bentoLabel}>ORDER ID</Text>
              <Text style={styles.bentoOrderId}>{orderDisplayId}</Text>
            </View>
            <View style={styles.bentoReceiptIcon}>
              <MaterialIcons
                name="receipt-long"
                size={24}
                color={C.primary}
              />
            </View>
          </View>

          {/* Delivery status timeline */}
          <View style={styles.timeline}>
            <View style={styles.timelineDots}>
              <View style={styles.timelineDot} />
              <View style={styles.timelineLine} />
            </View>
            <View style={styles.timelineContent}>
              <Text style={styles.timelineTitle}>
                Preparing your neighborhood goods
              </Text>
              <Text style={styles.timelineSubtext}>
                Estimated delivery in 25-35 mins
              </Text>
            </View>
          </View>

          {/* Seller image placeholders */}
          <View style={styles.sellerImages}>
            {sellerNames.map((name) => (
              <View key={name} style={styles.sellerImageCard}>
                <View style={styles.sellerImagePlaceholder}>
                  <MaterialIcons name="store" size={32} color={C.slate400} />
                </View>
                <View style={styles.sellerImageOverlay} />
                <Text style={styles.sellerImageLabel}>{name}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── CTAs ─────────────────────────── */}
        <View style={styles.ctaSection}>
          <TouchableOpacity
            style={styles.trackButton}
            activeOpacity={0.85}
            onPress={handleTrackOrders}
          >
            <LinearGradient
              colors={[C.primary, C.primaryDim]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.trackGradient}
            >
              <Text style={styles.trackText}>Track Orders</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleContinueShopping}
            style={styles.continueBtn}
          >
            <Text style={styles.continueText}>Continue Shopping</Text>
            <MaterialIcons
              name="chevron-right"
              size={16}
              color={C.onSurfaceVariant}
            />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ── Footer ─────────────────────────── */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}>
        <Text style={styles.footerText}>
          POWERED BY THE NEIGHBORHOOD APP
        </Text>
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
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  backBtn: { padding: 8, borderRadius: 999 },
  headerTitle: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: '#2dd4bf',
  },

  // Scroll
  scrollArea: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 48,
    alignItems: 'center',
  },

  // Icon section
  iconSection: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  iconGlow: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(0, 108, 92, 0.2)',
  },
  iconCircle: {
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: 'rgba(0, 108, 92, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 108, 92, 0.2)',
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 50,
    elevation: 20,
  },

  // Message
  messageSection: {
    alignItems: 'center',
    gap: 16,
    marginBottom: 40,
  },
  successHeading: {
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: C.onSurface,
    textAlign: 'center',
  },
  successSubtext: {
    fontSize: 16,
    color: C.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 320,
  },
  sellerHighlight: {
    color: C.primaryContainer,
    fontWeight: '600',
  },

  // Bento card
  bentoCard: {
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 32,
    width: '100%',
    gap: 24,
    borderWidth: 1,
    borderColor: C.outlineVariant10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
    marginBottom: 32,
  },
  bentoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bentoLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: C.onSurfaceVariant,
    textTransform: 'uppercase',
  },
  bentoOrderId: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 20,
    fontWeight: '700',
    color: C.onSurface,
    marginTop: 4,
  },
  bentoReceiptIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: C.surfaceHigh,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.15,
  },

  // Timeline
  timeline: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    paddingVertical: 16,
  },
  timelineDots: {
    alignItems: 'center',
    gap: 8,
  },
  timelineDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: C.primary,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  timelineLine: {
    width: 2,
    height: 32,
    backgroundColor: 'rgba(0, 108, 92, 0.3)',
  },
  timelineContent: { flex: 1 },
  timelineTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: C.onSurface,
  },
  timelineSubtext: {
    fontSize: 14,
    color: C.onSurfaceVariant,
    marginTop: 4,
  },

  // Seller images
  sellerImages: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 8,
  },
  sellerImageCard: {
    flex: 1,
    aspectRatio: 4 / 3,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  sellerImagePlaceholder: {
    flex: 1,
    backgroundColor: C.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sellerImageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  sellerImageLabel: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    fontSize: 12,
    fontWeight: '700',
    color: C.onSurface,
  },

  // CTAs
  ctaSection: {
    width: '100%',
    alignItems: 'center',
    gap: 24,
    paddingTop: 16,
    paddingBottom: 48,
  },
  trackButton: {
    width: '100%',
    borderRadius: 999,
    overflow: 'hidden',
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },
  trackGradient: {
    paddingVertical: 20,
    paddingHorizontal: 32,
    alignItems: 'center',
    borderRadius: 999,
  },
  trackText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 18,
    fontWeight: '700',
    color: '#e3fff6',
  },
  continueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  continueText: {
    fontSize: 15,
    fontWeight: '600',
    color: C.onSurfaceVariant,
  },

  // Footer
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 3,
    color: 'rgba(89, 96, 97, 0.4)',
    textTransform: 'uppercase',
  },
});
