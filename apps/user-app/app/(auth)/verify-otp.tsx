/**
 * OTP verification – verify OTP via API, persist token, then navigate.
 */
import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { PrimaryButton } from '@/components/PrimaryButton';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { useAuthStore } from '@/store/auth.store';

function maskPhone(phone: string): string {
  if (phone.length < 6) return phone;
  return `${phone.slice(0, 4)}****${phone.slice(-2)}`;
}

export default function VerifyOtpScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ phone: string }>();
  const phone = params.phone ?? '';
  const [otp, setOtp] = useState('');
  const { verifyOtp, isLoading, error, clearError } = useAuthStore();

  const handleVerify = async () => {
    if (otp.length !== 6 || !phone) return;
    clearError();
    try {
      await verifyOtp(phone, otp);
      router.replace('/(auth)/permissions');
    } catch {
      // Error shown from store
    }
  };

  const canSubmit = otp.length === 6 && phone.length > 0 && !isLoading;

  return (
    <ScreenWrapper>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={24}
      >
        <View style={styles.content}>
          <Text style={styles.title}>Verify OTP</Text>
          <Text style={styles.subtitle}>Code sent to {maskPhone(phone)}</Text>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <TextInput
            style={styles.input}
            placeholder="Enter 6-digit OTP"
            placeholderTextColor={colors.textMuted}
            keyboardType="number-pad"
            value={otp}
            onChangeText={setOtp}
            maxLength={6}
            editable={!isLoading}
          />
        </View>
        <View style={[styles.buttonWrap, { paddingBottom: spacing.lg + insets.bottom }]}>
          <PrimaryButton
            label={isLoading ? 'Verifying…' : 'Verify'}
            onPress={handleVerify}
            disabled={!canSubmit}
          />
        </View>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', paddingVertical: spacing.lg },
  title: {
    ...typography.screenTitle,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.secondary,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  errorText: {
    ...typography.secondary,
    color: colors.error,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.surfaceDark,
    borderWidth: 1,
    borderColor: colors.borderDark,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 18,
    color: colors.textPrimary,
    letterSpacing: 4,
    marginBottom: spacing.md,
  },
  buttonWrap: {},
});
