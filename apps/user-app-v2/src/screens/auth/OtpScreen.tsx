import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
  Keyboard,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { type NativeStackScreenProps } from '@react-navigation/native-stack';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '@/theme';
import { spacing, radius } from '@/theme/spacing';
import { fontSize, fontWeight } from '@/theme/typography';
import { useVerifyOtp, useRequestOtp } from '@/api/hooks/useAuth';
import { useAuthStore } from '@/stores/authStore';
import { showToast } from '@/stores/toastStore';
import { getErrorMessage } from '@/api/client';
import type { AuthStackParamList } from '@/navigation/AuthStack';

type Props = NativeStackScreenProps<AuthStackParamList, 'OTP'>;

const OTP_LENGTH = 6;
const RESEND_DELAY = 30;

export function OtpScreen({ route, navigation }: Props) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const isDark = theme.resolvedMode === 'dark';
  const insets = useSafeAreaInsets();
  const { phone } = route.params;

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [activeIndex, setActiveIndex] = useState(0);
  const [resendTimer, setResendTimer] = useState(RESEND_DELAY);
  const [hasError, setHasError] = useState(false);

  const inputRefs = useRef<Array<TextInput | null>>(
    Array(OTP_LENGTH).fill(null),
  );
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const verifyOtp = useVerifyOtp();
  const requestOtp = useRequestOtp();
  const login = useAuthStore(s => s.login);

  const otpValue = otp.join('');
  const canVerify = otpValue.length === OTP_LENGTH && !verifyOtp.isPending;

  // Countdown timer
  useEffect(() => {
    if (resendTimer === 0) return;
    const id = setTimeout(() => setResendTimer(t => t - 1), 1000);
    return () => clearTimeout(id);
  }, [resendTimer]);

  // Focus first box on mount
  useEffect(() => {
    setTimeout(() => inputRefs.current[0]?.focus(), 300);
  }, []);

  const shake = useCallback(() => {
    setHasError(true);
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: 8,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -8,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 6,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -6,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, [shakeAnim]);

  function handleDigit(text: string, index: number) {
    const digit = text.replace(/\D/g, '').slice(-1);
    setHasError(false);

    if (!digit) {
      // Backspace — clear current, focus previous
      const next = [...otp];
      next[index] = '';
      setOtp(next);
      if (index > 0) {
        inputRefs.current[index - 1]?.focus();
        setActiveIndex(index - 1);
      }
      return;
    }

    const next = [...otp];
    next[index] = digit;
    setOtp(next);

    if (index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
      setActiveIndex(index + 1);
    } else {
      Keyboard.dismiss();
      // Auto-submit when last digit entered
      submitOtp([...next].join(''));
    }
  }

  const submitOtp = useCallback(
    async (code: string) => {
      try {
        const res = await verifyOtp.mutateAsync({ phone, otp: code });
        console.log('OTP verified, logging in:', res);
        await login({
          accessToken: res.accessToken,
          refreshToken: res.refreshToken,
          user: res.user,
        });
        // RootNavigator will detect isAuthenticated and switch to MainTabs
      } catch (err) {
        shake();
        showToast({ type: 'error', message: getErrorMessage(err) });
      }
    },
    [phone, verifyOtp, login, shake],
  );

  async function handleVerify() {
    if (!canVerify) return;
    await submitOtp(otpValue);
  }

  async function handleResend() {
    if (resendTimer > 0) return;
    try {
      await requestOtp.mutateAsync(phone);
      setResendTimer(RESEND_DELAY);
      setOtp(Array(OTP_LENGTH).fill(''));
      setHasError(false);
      inputRefs.current[0]?.focus();
      setActiveIndex(0);
      showToast({ type: 'success', message: 'OTP resent successfully' });
    } catch (err) {
      showToast({ type: 'error', message: getErrorMessage(err) });
    }
  }

  const formattedPhone = phone
    .replace('+91', '+91 ')
    .replace(/(\d{5})(\d{5})/, '$1 $2');

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Back button */}
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: colors.surface2 }]}
            onPress={() => navigation.goBack()}
            hitSlop={8}
          >
            <Text style={[styles.backArrow, { color: colors.text }]}>←</Text>
          </TouchableOpacity>

          {/* Heading */}
          <View style={styles.headingSection}>
            <Text style={[styles.title, { color: colors.text }]}>
              Enter verification code
            </Text>
            <View style={styles.sentRow}>
              <Text style={[styles.sentText, { color: colors.text2 }]}>
                Sent to{' '}
                <Text style={[styles.sentPhone, { color: colors.text }]}>
                  {formattedPhone}
                </Text>
              </Text>
              <TouchableOpacity onPress={() => navigation.goBack()}>
                <Text style={[styles.editLink, { color: colors.primary }]}>
                  {' '}
                  Edit
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* OTP boxes */}
          <Animated.View
            style={[styles.boxRow, { transform: [{ translateX: shakeAnim }] }]}
          >
            {otp.map((digit, i) => {
              const isFocused = activeIndex === i;
              const isError = hasError;
              const boxBorderWidth = isFocused || isError ? 2 : 1.5;

              return (
                <View
                  key={i}
                  style={[
                    styles.box,
                    {
                      backgroundColor: digit
                        ? colors.surfaceInverse
                        : colors.surface,
                      borderColor: isError
                        ? colors.danger
                        : isFocused
                        ? colors.primary
                        : colors.border,
                      borderWidth: boxBorderWidth,
                    },
                  ]}
                >
                  <TextInput
                    ref={ref => {
                      inputRefs.current[i] = ref;
                    }}
                    style={[
                      styles.boxInput,
                      {
                        color: digit
                          ? isDark
                            ? colors.text
                            : '#fff'
                          : colors.text,
                      },
                    ]}
                    value={digit}
                    onChangeText={t => handleDigit(t, i)}
                    onFocus={() => setActiveIndex(i)}
                    keyboardType="number-pad"
                    maxLength={1}
                    textAlign="center"
                    caretHidden
                    editable={!verifyOtp.isPending}
                    selectTextOnFocus
                  />
                </View>
              );
            })}
          </Animated.View>

          {/* Resend row */}
          <View style={styles.resendRow}>
            {resendTimer > 0 ? (
              <Text style={[styles.resendTimer, { color: colors.text3 }]}>
                Resend code in{' '}
                <Text
                  style={{ color: colors.primary, fontWeight: fontWeight.bold }}
                >
                  0:{resendTimer.toString().padStart(2, '0')}
                </Text>
              </Text>
            ) : (
              <TouchableOpacity
                onPress={handleResend}
                disabled={requestOtp.isPending}
              >
                <Text style={[styles.resendLink, { color: colors.primary }]}>
                  {requestOtp.isPending
                    ? 'Sending…'
                    : "Didn't get the code? Resend"}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Verify button */}
          <TouchableOpacity
            onPress={handleVerify}
            disabled={!canVerify}
            activeOpacity={0.88}
          >
            <LinearGradient
              colors={
                canVerify
                  ? ['#14b8c4', '#0b8a93']
                  : [colors.border, colors.border]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.cta, !canVerify && styles.ctaDisabled]}
            >
              <Text
                style={[
                  styles.ctaText,
                  canVerify ? styles.ctaTextEnabled : { color: colors.text3 },
                ]}
              >
                {verifyOtp.isPending ? 'Verifying…' : 'Verify'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    gap: spacing['3xl'],
  },

  // Back
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  backArrow: { fontSize: 20 },

  // Heading
  headingSection: { gap: spacing.sm },
  title: {
    fontSize: fontSize.titleLg,
    fontWeight: fontWeight.bold,
  },
  sentRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  sentText: { fontSize: fontSize.body },
  sentPhone: { fontWeight: fontWeight.semibold },
  editLink: { fontSize: fontSize.body, fontWeight: fontWeight.semibold },

  // Boxes
  boxRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  box: {
    flex: 1,
    height: 56,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxInput: {
    width: '100%',
    height: '100%',
    fontSize: fontSize.titleLg,
    fontWeight: fontWeight.bold,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },

  // Resend
  resendRow: { alignItems: 'center' },
  resendTimer: { fontSize: fontSize.body },
  resendLink: { fontSize: fontSize.body, fontWeight: fontWeight.medium },

  // CTA
  cta: {
    height: 56,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaDisabled: { opacity: 0.6 },
  ctaText: {
    fontSize: fontSize.bodyLg,
    fontWeight: fontWeight.bold,
  },
  ctaTextEnabled: {
    color: '#fff',
  },
});
