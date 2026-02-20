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
  useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Button } from '@/components/Button';
import { OTPInput } from '@/components/OTPInput';
import { radius } from '@/constants/radius';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { showToast } from '@/lib/toast';
import { useAuthStore } from '@/store/auth.store';
import { useResolvedThemeMode, useThemeColors, useThemedStyles } from '@/theme';

const RESEND_SECONDS = 30;

function getPhoneLocalPart(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length >= 12 && digits.startsWith('91')) return digits.slice(-10);
  return digits.slice(-10);
}

function maskPhoneNumber(phone: string): string {
  const local = getPhoneLocalPart(phone);
  if (local.length < 4) return phone;
  return `+91 ${local.slice(0, 2)}*****${local.slice(-2)}`;
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
  const { height: viewportHeight } = useWindowDimensions();

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

  const canVerify = otp.length === 6 && !isVerifying && !isResending;
  const heroMinHeight = Math.max(240, Math.floor(viewportHeight * 0.46));
  const sheetMinHeight = Math.max(340, Math.floor(viewportHeight * 0.54));

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
      setIsVerifying(false);
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
      <View style={styles.blobTopRight} />
      <View style={styles.blobLeftMid} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={insets.top + spacing.lg}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={[styles.heroSection, { minHeight: heroMinHeight, paddingTop: insets.top + spacing['2xl'] }]}>
            <LinearGradient
              colors={[colors.primaryLight, 'rgba(13, 242, 242, 0.04)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroCircle}
            >
              <View style={styles.heroCircleInner}>
                <MaterialIcons name="storefront" size={112} color={colors.primary} />
              </View>
            </LinearGradient>
          </View>

          <View style={[styles.sheetContainer, { minHeight: sheetMinHeight }]}>
            <BlurView
              intensity={mode === 'dark' ? 28 : 36}
              tint={mode === 'dark' ? 'dark' : 'light'}
              style={styles.sheetBlur}
            >
              <View style={[styles.sheet, { paddingBottom: spacing['3xl'] + insets.bottom }]}>
                <View style={styles.backRow}>
                  <Pressable onPress={() => router.replace('/(auth)/login')} hitSlop={10} style={styles.backButton}>
                    <MaterialIcons name="arrow-back" size={22} color={colors.textPrimary} />
                  </Pressable>
                </View>

                <View style={styles.headerWrap}>
                  <Text style={styles.title}>Verify OTP</Text>
                  <Text style={styles.subtitle}>Enter the 6-digit code sent to</Text>
                  <View style={styles.phoneRow}>
                    <Text style={styles.phoneText}>{maskedPhone}</Text>
                    <Pressable onPress={() => router.replace('/(auth)/login')} hitSlop={8}>
                      <Text style={styles.wrongNumber}>Wrong number?</Text>
                    </Pressable>
                  </View>
                </View>

                  <OTPInput
                    key={otpInputKey}
                    length={6}
                    value={otp}
                    onChange={setOtp}
                    error={otpError}
                    autoFocus
                  />

                <Button
                  title={isVerifying ? 'Verifying...' : 'VERIFY'}
                  variant="primary"
                  size="lg"
                  fullWidth
                  onPress={handleVerify}
                  disabled={!canVerify}
                  loading={isVerifying}
                />

                {secondsLeft > 0 ? (
                  <Text style={styles.timerText}>
                    Resend code in{' '}
                    <Text style={[styles.timerValue, mode === 'dark' ? styles.timerValueDark : null]}>
                      {formatTimer(secondsLeft)}
                    </Text>
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
            </BlurView>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    flex: { flex: 1 },
    scrollContent: {
      flexGrow: 1,
      justifyContent: 'space-between',
    },
    screen: {
      flex: 1,
      backgroundColor: colors.background,
      position: 'relative',
      overflow: 'hidden',
    },
    blobTopRight: {
      position: 'absolute',
      width: 260,
      height: 260,
      borderRadius: radius.full,
      backgroundColor: 'rgba(13, 242, 242, 0.22)',
      top: -130,
      right: -110,
      shadowColor: '#0df2f2',
      shadowOpacity: 0.4,
      shadowRadius: 40,
      shadowOffset: { width: 0, height: 0 },
    },
    blobLeftMid: {
      position: 'absolute',
      width: 200,
      height: 200,
      borderRadius: radius.full,
      backgroundColor: 'rgba(13, 242, 242, 0.12)',
      top: '28%',
      left: -100,
      shadowColor: '#0df2f2',
      shadowOpacity: 0.3,
      shadowRadius: 32,
      shadowOffset: { width: 0, height: 0 },
    },
    heroSection: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing['3xl'],
      paddingBottom: spacing.lg,
    },
    heroCircle: {
      width: '100%',
      maxWidth: 280,
      aspectRatio: 1,
      borderRadius: radius.full,
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroCircleInner: {
      width: '92%',
      height: '92%',
      borderRadius: radius.full,
      backgroundColor: 'rgba(255,255,255,0.18)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    sheetContainer: {
      borderTopLeftRadius: radius.sheet,
      borderTopRightRadius: radius.sheet,
      overflow: 'hidden',
    },
    sheetBlur: {
      borderTopLeftRadius: radius.sheet,
      borderTopRightRadius: radius.sheet,
      overflow: 'hidden',
    },
    sheet: {
      backgroundColor:
        colors.textPrimary === colors.textLight
          ? 'rgba(21, 42, 42, 0.9)'
          : 'rgba(255, 255, 255, 0.8)',
      borderTopLeftRadius: radius.sheet,
      borderTopRightRadius: radius.sheet,
      borderTopWidth: 1,
      borderTopColor: 'rgba(255,255,255,0.2)',
      paddingHorizontal: spacing['3xl'],
      paddingTop: spacing['2xl'],
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -10 },
      shadowOpacity: 0.1,
      shadowRadius: 40,
      elevation: 10,
      gap: spacing.lg,
    },
    backRow: {
      flexDirection: 'row',
      justifyContent: 'flex-start',
      marginBottom: spacing.xs,
    },
    backButton: {
      width: 36,
      height: 36,
      borderRadius: radius.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primaryLight,
    },
    headerWrap: {
      alignItems: 'center',
      gap: spacing.sm,
    },
    title: {
      ...typography.displayLarge,
      color: colors.textPrimary,
      letterSpacing: -0.64,
    },
    subtitle: {
      ...typography.bodyMedium,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    phoneRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      flexWrap: 'wrap',
      justifyContent: 'center',
    },
    phoneText: {
      ...typography.labelLarge,
      color: colors.textPrimary,
      fontWeight: '700',
    },
    wrongNumber: {
      ...typography.bodySmall,
      color: colors.primary,
      fontWeight: '700',
    },
    timerText: {
      ...typography.bodyMedium,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    timerValue: {
      color: colors.textPrimary,
      fontWeight: '700',
    },
    timerValueDark: {
      color: colors.primary,
    },
    resendRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
    },
    resendHint: {
      ...typography.bodyMedium,
      color: colors.textSecondary,
    },
    resendLink: {
      ...typography.bodyMedium,
      color: colors.primary,
      fontWeight: '700',
    },
  });
