/**
 * Login screen – phone number input, request OTP via API.
 */
import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { PrimaryButton } from '@/components/PrimaryButton';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { useAuthStore } from '@/store/auth.store';
import { toE164 } from '@/utils/phone';

const PHONE_PLACEHOLDER = '10-digit mobile number';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [phone, setPhone] = useState('');
  const isLoading = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.error);
  const requestOtp = useAuthStore((s) => s.requestOtp);
  const clearError = useAuthStore((s) => s.clearError);

  const handleContinue = async () => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length !== 10) {
      return;
    }
    clearError();
    try {
      await requestOtp(toE164(phone));
      router.push({ pathname: '/(auth)/verify-otp', params: { phone: toE164(phone) } });
    } catch {
      // Error shown from store
    }
  };

  const digitsOnly = phone.replace(/\D/g, '');
  const canSubmit = digitsOnly.length === 10 && !isLoading;

  return (
    <ScreenWrapper>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={24}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <Text style={styles.title}>Welcome to LocalCoord</Text>
            <Text style={styles.subtitle}>Enter your phone number to continue</Text>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <TextInput
              style={styles.input}
              placeholder={PHONE_PLACEHOLDER}
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              maxLength={10}
              editable={!isLoading}
            />
          </View>
        </ScrollView>
        <View style={[styles.buttonWrap, { paddingBottom: spacing.lg + insets.bottom }]}>
          <PrimaryButton
            label={isLoading ? 'Sending…' : 'Send OTP'}
            onPress={handleContinue}
            disabled={!canSubmit}
          />
        </View>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  content: { flex: 1, justifyContent: 'center', paddingVertical: spacing.lg, minHeight: 280 },
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
  buttonWrap: {},
  input: {
    backgroundColor: colors.surfaceDark,
    borderWidth: 1,
    borderColor: colors.borderDark,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm - 2,
    fontSize: 16,
    color: colors.textPrimary,
  },
});
