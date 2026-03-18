/**
 * Landing page – value proposition, redirects to login on "Get Started"
 */
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors, useThemedStyles, type ThemeColors } from '@/theme';
import { typography } from '@/constants/typography';
import { spacing } from '@/constants/spacing';
import { radius } from '@/constants/radius';

export default function LandingScreen() {
  const colors = useThemeColors();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleGetStarted = () => {
    router.push('/(auth)/login');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl }]}>
      <View style={styles.content}>
        <View style={styles.heroSection}>
          <View style={styles.logoContainer}>
            <Ionicons name="storefront" size={64} color={colors.primary} />
          </View>
          <Text style={styles.title}>Local Shop</Text>
          <Text style={styles.subtitle}>
            Get urgent local items and services delivered to your doorstep. Connect with nearby sellers instantly.
          </Text>
        </View>

        <View style={styles.features}>
          <View style={styles.featureRow}>
            <Ionicons name="flash" size={24} color={colors.primary} />
            <Text style={styles.featureText}>Fast delivery from local sellers</Text>
          </View>
          <View style={styles.featureRow}>
            <Ionicons name="location" size={24} color={colors.primary} />
            <Text style={styles.featureText}>Order from shops near you</Text>
          </View>
          <View style={styles.featureRow}>
            <Ionicons name="shield-checkmark" size={24} color={colors.primary} />
            <Text style={styles.featureText}>Secure payments & tracking</Text>
          </View>
        </View>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
        <Pressable
          style={styles.primaryButton}
          onPress={handleGetStarted}
          android_ripple={{ color: 'rgba(255,255,255,0.3)' }}
        >
          <Text style={styles.primaryButtonText}>Get Started</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </Pressable>
        
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.surface,
      paddingHorizontal: spacing.xl,
      justifyContent: 'space-between',
    },
    content: {
      flex: 1,
      justifyContent: 'center',
    },
    heroSection: {
      alignItems: 'center',
      marginBottom: spacing.xl * 2,
    },
    logoContainer: {
      width: 120,
      height: 120,
      borderRadius: radius.full,
      backgroundColor: colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.lg,
    },
    title: {
      ...typography.displayLarge,
      color: colors.textPrimary,
      marginBottom: spacing.md,
      textAlign: 'center',
    },
    subtitle: {
      ...typography.bodyLarge,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 26,
      maxWidth: 320,
    },
    features: {
      gap: spacing.lg,
    },
    featureRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    featureText: {
      ...typography.bodyLarge,
      color: colors.textPrimary,
      flex: 1,
    },
    footer: {
      gap: spacing.md,
    },
    primaryButton: {
      flexDirection: 'row',
      backgroundColor: colors.primary,
      height: 56,
      borderRadius: radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
    },
    primaryButtonText: {
      ...typography.labelLarge,
      color: colors.textLight,
    },
    secondaryButton: {
      alignItems: 'center',
      paddingVertical: spacing.md,
    },
    secondaryButtonText: {
      ...typography.bodyLarge,
      color: colors.primary,
      fontWeight: '600',
    },
  });
