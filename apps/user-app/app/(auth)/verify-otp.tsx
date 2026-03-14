/**
 * OTP verification screen – 6-digit OTP with resend flow.
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { OTPInput } from '@/components/OTPInput';
import { showToast } from '@/lib/toast';
import { useAuthStore } from '@/store/auth.store';
import { useResolvedThemeMode, useThemeColors, useThemedStyles } from '@/theme';

const RESEND_SECONDS = 30;

function getPhoneLocalPart(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length >= 10 && digits.startsWith('1')) return digits.slice(-10); // Handle +1
  if (digits.length >= 12 && digits.startsWith('91')) return digits.slice(-10); // Handle +91
  return digits.slice(-10);
}

function maskPhoneNumber(phone: string): string {
  const local = getPhoneLocalPart(phone);
  if (local.length < 4) return phone;
  // +1 234 *** **90 format for US numbers
  return `+1 ${local.slice(0, 3)} *** **${local.slice(-2)}`;
}

function formatTimer(seconds: number): string {
  return `00:${seconds.toString().padStart(2, '0')}`;
}

export default function VerifyOtpScreen() {
  const colors = useThemeColors();
  const mode = useResolvedThemeMode();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ phone?: string }>();

  const verifyOtp = useAuthStore((s) => s.verifyOtp);
  const requestOtp = useAuthStore((s) => s.requestOtp);
  const clearError = useAuthStore((s) => s.clearError);

  const phoneParam = typeof params.phone === 'string' ? params.phone : '';
  const maskedPhone = useMemo(() => maskPhoneNumber(phoneParam), [phoneParam]);
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const [otpInputKey, setOtpInputKey] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  // Still supporting 6-digits for verification based on API spec
  const canVerify = otp.length === 6 && !isVerifying && !isResending;

  useEffect(() => {
    if (secondsLeft <= 0) return undefined;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [secondsLeft]);

  useEffect(() => {
    if (!otpError) return;
    const t = setTimeout(() => setOtpError(false), 600);
    return () => clearTimeout(t);
  }, [otpError]);

  const handleVerify = async () => {
    if (!phoneParam) {
      showToast({ type: 'error', message: 'Phone number is missing. Please login again.' });
      router.replace('/(auth)/login');
      return;
    }
    if (!canVerify) return;

    clearError();
    setIsVerifying(true);
    try {
      await verifyOtp(phoneParam, otp);
      router.replace('/(tabs)/home');
    } catch (err) {
      const message =
        err instanceof Error && err.message ? err.message : 'Invalid OTP. Please try again.';
      setOtpError(true);
      setOtp('');
      setOtpInputKey((prev) => prev + 1);
      showToast({ type: 'error', message });
    } finally {
      setIsVerifying(false); // Clean up
    }
  };

  const handleResend = async () => {
    if (!phoneParam || secondsLeft > 0 || isVerifying || isResending) return;
    clearError();
    setIsResending(true);
    try {
      await requestOtp(phoneParam);
      setOtp('');
      setOtpError(false);
      setOtpInputKey((prev) => prev + 1);
      setSecondsLeft(RESEND_SECONDS);
      showToast({ type: 'success', message: 'OTP sent!' });
    } catch (err) {
      const message =
        err instanceof Error && err.message ? err.message : 'Unable to resend OTP. Try again.';
      showToast({ type: 'error', message });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Header Row */}
          <View style={styles.header}>
            <Pressable onPress={() => router.replace('/(auth)/login')} hitSlop={10} style={styles.backButton}>
              <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
            </Pressable>
          </View>

          {/* Illustration Container */}
          <View style={styles.illustrationContainer}>
            <View style={styles.illustrationCircle}>
              <Image
                source={{ uri: 'https://cdn-icons-png.flaticon.com/512/3063/3063822.png' }}
                style={styles.illustrationImage}
                resizeMode="contain"
                tintColor={colors.primaryDark}
              />
              <View style={styles.badgeContainer}>
                 <Ionicons name="checkmark-circle" size={24} color={colors.primary} style={{ backgroundColor: '#fff', borderRadius: 12 }} />
              </View>
            </View>
          </View>

          {/* Text Content */}
          <View style={styles.textContent}>
            <Text style={styles.title}>Verify OTP</Text>
            <Text style={styles.subtitle}>Enter the 6-digit code sent to</Text>
            <Text style={styles.phoneText}>{maskedPhone}</Text>
          </View>

          {/* OTP Input Container */}
          <View style={styles.otpContainer}>
             <OTPInput
              key={otpInputKey}
              length={6}
              value={otp}
              onChange={setOtp}
              error={otpError}
              autoFocus
             />
          </View>

          {/* Verify Button */}
          <Pressable
            style={[styles.primaryButton, (!canVerify || isVerifying) && styles.primaryButtonDisabled]}
            onPress={handleVerify}
            disabled={!canVerify || isVerifying}
          >
            <Text style={styles.primaryButtonText}>
              {isVerifying ? 'VERIFYING...' : 'VERIFY'}
            </Text>
          </Pressable>

          {/* Resend Timer */}
          <View style={styles.resendContainer}>
            {secondsLeft > 0 ? (
              <Text style={styles.timerText}>
                Resend code in <Text style={styles.timerValue}>{formatTimer(secondsLeft)}</Text>
              </Text>
            ) : (
              <View style={styles.resendRow}>
                <Text style={styles.resendHint}>Didn't receive code? </Text>
                <Pressable onPress={handleResend} hitSlop={8}>
                  <Text style={styles.resendLink}>Resend</Text>
                </Pressable>
              </View>
            )}
          </View>

          {/* Bottom Indicator (Simulated Home Indicator spacer) */}
          <View style={styles.bottomSpacer} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    flex: { flex: 1 },
    screen: {
      flex: 1,
      backgroundColor: colors.surface,
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: 24,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 32,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
    },
    illustrationContainer: {
      alignItems: 'center',
      marginBottom: 48,
    },
    illustrationCircle: {
      width: 200,
      height: 200,
      borderRadius: 100,
      backgroundColor: colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    illustrationImage: {
      width: 120,
      height: 120,
      opacity: 0.8,
    },
    badgeContainer: {
      position: 'absolute',
      top: 10,
      right: 20,
    },
    textContent: {
      alignItems: 'center',
      marginBottom: 32,
    },
    title: {
      fontSize: 32,
      fontWeight: 'bold',
      color: colors.textPrimary,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 4,
    },
    phoneText: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.primaryDark,
      letterSpacing: 0.5,
    },
    otpContainer: {
      alignItems: 'center',
      marginBottom: 40,
    },
    primaryButton: {
      backgroundColor: colors.primary,
      height: 56,
      borderRadius: 32,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 24,
      shadowColor: colors.primaryDark,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 5,
    },
    primaryButtonDisabled: {
      opacity: 0.6,
      shadowOpacity: 0,
      elevation: 0,
    },
    primaryButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '700',
      letterSpacing: 1,
    },
    resendContainer: {
      alignItems: 'center',
      marginTop: 'auto',
      marginBottom: 20,
    },
    timerText: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    timerValue: {
      fontWeight: 'bold',
      color: colors.primaryDark,
    },
    resendRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    resendHint: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    resendLink: {
      fontSize: 14,
      fontWeight: 'bold',
      color: colors.primary,
    },
    bottomSpacer: {
      width: 134,
      height: 5,
      backgroundColor: '#E5E7EB',
      borderRadius: 3,
      alignSelf: 'center',
      marginTop: 20,
    },
  });
