/**
 * Checkout Failure Screen
 *
 * Payment failure state with retry and back-to-checkout options.
 *
 * Visual source: stitch/checkout_flow/failure
 */
import React from 'react';
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

// ── Design Tokens ────────────────────────────────
const C = {
  bg: '#0b0f0f',
  slate900: '#111827',
  slate800: '#1e293b',
  slate700: '#334155',
  slate500: '#64748b',
  slate400: '#94a3b8',
  slate300: '#cbd5e1',
  teal400: '#2dd4bf',
  teal900_30: 'rgba(19, 78, 74, 0.3)',
  error: '#ac3434',
  errorDim: '#70030f',
  errorContainer: '#f56965',
  tertiaryFixed: '#ffa184',
  primary: '#006c5c',
  primaryDim: '#005e51',
  onPrimary: '#e3fff6',
  onSurfaceVariant: '#596061',
  white: '#ffffff',
} as const;

export default function CheckoutFailureScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleRetry = () => {
    router.back(); // Go back to payment screen
  };

  const handleBackToCheckout = () => {
    router.navigate('/(root)/checkout');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Decorative Background Glow */}
      <View style={styles.bgGlow1} />
      <View style={styles.bgGlow2} />

      {/* ── Header ──────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            onPress={handleBackToCheckout}
            style={styles.backBtn}
          >
            <MaterialIcons name="arrow-back" size={24} color={C.teal400} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Checkout</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 16) + 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.centeredContent}>
          {/* ── Error Icon ──────────────────── */}
          <View style={styles.iconSection}>
            <View style={styles.errorGlow} />
            <View style={styles.errorCircle}>
              <MaterialIcons
                name="report"
                size={48}
                color={C.errorContainer}
              />
            </View>
          </View>

          {/* ── Message ─────────────────────── */}
          <View style={styles.messageSection}>
            <Text style={styles.failureHeading}>Payment Failed</Text>
            <Text style={styles.failureSubtext}>
              Don't worry, no money was deducted. Please try again.
            </Text>
          </View>

          {/* ── Info Card ───────────────────── */}
          <View style={styles.infoCard}>
            {/* Secure Guarantee */}
            <View style={styles.infoRow}>
              <MaterialIcons name="security" size={24} color={C.teal400} />
              <View style={styles.infoContent}>
                <Text style={styles.infoTitle}>Secure Guarantee</Text>
                <Text style={styles.infoDetail}>
                  Your transaction remains encrypted and protected.
                </Text>
              </View>
            </View>

            {/* Need Help */}
            <View style={styles.infoRow}>
              <MaterialIcons
                name="help-center"
                size={24}
                color={C.tertiaryFixed}
              />
              <View style={styles.infoContent}>
                <Text style={styles.infoTitle}>Need Help?</Text>
                <Text style={styles.infoDetail}>
                  Our community support is available 24/7 for you.
                </Text>
              </View>
            </View>
          </View>

          {/* ── Action Buttons ──────────────── */}
          <View style={styles.ctaSection}>
            <TouchableOpacity
              style={styles.retryButton}
              activeOpacity={0.85}
              onPress={handleRetry}
            >
              <LinearGradient
                colors={[C.primary, C.primaryDim]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.retryGradient}
              >
                <Text style={styles.retryText}>Retry Payment</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backButton}
              activeOpacity={0.7}
              onPress={handleBackToCheckout}
            >
              <Text style={styles.backButtonText}>Back to Checkout</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  // Background glows
  bgGlow1: {
    position: 'absolute',
    top: '-10%',
    left: '-10%',
    width: '40%',
    height: '40%',
    backgroundColor: 'rgba(0, 108, 92, 0.1)',
    borderRadius: 999,
    opacity: 0.5,
  },
  bgGlow2: {
    position: 'absolute',
    bottom: '20%',
    right: '-5%',
    width: '30%',
    height: '30%',
    backgroundColor: 'rgba(172, 52, 52, 0.05)',
    borderRadius: 999,
    opacity: 0.5,
  },

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

  // Scroll
  scrollArea: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 24,
    justifyContent: 'center',
    flexGrow: 1,
  },

  centeredContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Icon section
  iconSection: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  errorGlow: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(172, 52, 52, 0.2)',
  },
  errorCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: C.errorDim,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'rgba(172, 52, 52, 0.3)',
  },

  // Message
  messageSection: {
    alignItems: 'center',
    gap: 16,
    marginBottom: 48,
  },
  failureHeading: {
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: C.white,
    textAlign: 'center',
  },
  failureSubtext: {
    fontSize: 16,
    color: C.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 280,
  },

  // Info card
  infoCard: {
    backgroundColor: C.slate900,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
    marginBottom: 48,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    padding: 12,
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    borderRadius: 16,
  },
  infoContent: { flex: 1 },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: C.white,
  },
  infoDetail: {
    fontSize: 12,
    color: C.onSurfaceVariant,
    marginTop: 4,
    lineHeight: 18,
  },

  // CTAs
  ctaSection: {
    width: '100%',
    gap: 16,
  },
  retryButton: {
    borderRadius: 999,
    overflow: 'hidden',
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  retryGradient: {
    paddingVertical: 20,
    alignItems: 'center',
    borderRadius: 999,
  },
  retryText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 16,
    fontWeight: '700',
    color: C.onPrimary,
  },
  backButton: {
    borderWidth: 2,
    borderColor: C.slate700,
    borderRadius: 999,
    paddingVertical: 20,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: C.slate300,
  },
});
