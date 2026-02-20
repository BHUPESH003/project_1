/**
 * Login screen – phone number input, request OTP via API.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Keyboard,
  Pressable,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Button } from '@/components/Button';
import { radius } from '@/constants/radius';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { useResolvedThemeMode, useThemeColors, useThemedStyles } from '@/theme';
import { useAuthStore } from '@/store/auth.store';
import { toE164 } from '@/utils/phone';
import { showToast } from '@/lib/toast';

const PHONE_PLACEHOLDER = 'Phone number';

export default function LoginScreen() {
  const colors = useThemeColors();
  const mode = useResolvedThemeMode();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height: viewportHeight } = useWindowDimensions();
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView | null>(null);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const heroMinHeight = Math.max(260, Math.floor(viewportHeight * 0.48));
  const sheetMinHeight = Math.max(320, Math.floor(viewportHeight * 0.52));

  const isLoading = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.error);
  const requestOtp = useAuthStore((s) => s.requestOtp);
  const clearError = useAuthStore((s) => s.clearError);

  const digitsOnly = useMemo(() => phone.replace(/\D/g, ''), [phone]);
  const canSubmit = digitsOnly.length === 10 && !isLoading;
  const showValidationError = Boolean(phoneError);

  const validatePhone = () => {
    if (digitsOnly.length < 10) {
      setPhoneError('Please enter a valid 10-digit phone number');
      return false;
    }
    setPhoneError(null);
    return true;
  };

  const handleContinue = async () => {
    if (!validatePhone() || isLoading) return;

    clearError();
    try {
      await requestOtp(toE164(digitsOnly));
      router.push({ pathname: '/(auth)/verify-otp', params: { phone: toE164(digitsOnly) } });
    } catch (err) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : error || 'Unable to send OTP. Please try again.';
      showToast({ type: 'error', message });
    }
  };

  useEffect(() => {
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const hideSub = Keyboard.addListener(hideEvent, () => {
      if (!isInputFocused) {
        scrollRef.current?.scrollTo({ y: 0, animated: true });
      }
    });

    return () => {
      hideSub.remove();
    };
  }, [isInputFocused]);

  const handleInputFocus = () => {
    setIsInputFocused(true);
    setPhoneError(null);
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: Math.max(140, Math.floor(viewportHeight * 0.18)), animated: true });
    }, 80);
  };

  const handleInputBlur = () => {
    setIsInputFocused(false);
    if (digitsOnly.length > 0 && digitsOnly.length < 10) {
      setPhoneError('Please enter a valid 10-digit phone number');
    } else {
      setPhoneError(null);
    }
  };

  const handleCreateAccount = () => {
    if (!digitsOnly.length) {
      showToast({ type: 'info', message: 'Enter your phone number to get started' });
      return;
    }
    handleContinue();
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
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          onScrollBeginDrag={Keyboard.dismiss}
          automaticallyAdjustKeyboardInsets
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
                <View style={styles.headerWrap}>
                  <Text style={styles.title}>Login</Text>
                  <Text style={styles.subtitle}>Access the best local shops nearby.</Text>
                </View>

                {showValidationError ? <Text style={styles.errorText}>{phoneError}</Text> : null}
                {!showValidationError && error ? <Text style={styles.errorText}>{error}</Text> : null}

                <View
                  style={[
                    styles.inputWrap,
                    isInputFocused && styles.inputWrapFocused,
                    showValidationError && styles.inputWrapError,
                  ]}
                >
                  <MaterialIcons name="phone" size={20} color={colors.textMuted} style={styles.leftIcon} />
                  <View style={styles.prefixPill}>
                    <Text style={styles.prefixText}>+91</Text>
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder={PHONE_PLACEHOLDER}
                    placeholderTextColor={colors.textMuted}
                    keyboardType="number-pad"
                    value={digitsOnly}
                    onChangeText={(text) => {
                      if (phoneError) setPhoneError(null);
                      setPhone(text.replace(/\D/g, ''));
                    }}
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                    maxLength={10}
                    editable={!isLoading}
                  />
                  {digitsOnly.length ? (
                    <Pressable
                      onPress={() => {
                        setPhone('');
                        setPhoneError(null);
                      }}
                      hitSlop={8}
                      style={styles.clearButton}
                    >
                      <MaterialIcons name="close" size={18} color={colors.textMuted} />
                    </Pressable>
                  ) : null}
                </View>

                <Button
                  title={isLoading ? 'Sending...' : 'SEND OTP'}
                  variant="primary"
                  size="lg"
                  fullWidth
                  onPress={handleContinue}
                  disabled={!canSubmit}
                  loading={isLoading}
                />

                <View style={styles.footerRow}>
                  <Text style={styles.footerText}>New here? </Text>
                  <Pressable onPress={handleCreateAccount} hitSlop={8}>
                    <Text style={[styles.footerLink, mode === 'dark' ? styles.footerLinkDark : null]}>
                      Create account
                    </Text>
                  </Pressable>
                </View>
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
      paddingTop: spacing['3xl'],
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -10 },
      shadowOpacity: 0.1,
      shadowRadius: 40,
      elevation: 10,
      gap: spacing.lg,
    },
    headerWrap: {
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: spacing.sm,
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
      fontFamily: typography.bodyMedium.fontFamily,
      fontWeight: '500',
    },
    errorText: {
      ...typography.bodySmall,
      color: colors.error,
      textAlign: 'center',
      marginBottom: spacing.xs,
    },
    inputWrap: {
      minHeight: 56,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceMuted,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      gap: spacing.sm,
    },
    inputWrapFocused: {
      borderWidth: 2,
      borderColor: colors.primary,
      backgroundColor: colors.surface,
    },
    inputWrapError: {
      borderWidth: 2,
      borderColor: colors.error,
    },
    leftIcon: {
      marginRight: spacing.xs,
    },
    prefixPill: {
      minWidth: 46,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: radius.lg,
      backgroundColor: colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    prefixText: {
      ...typography.labelLarge,
      color: colors.textPrimary,
      letterSpacing: 0.2,
    },
    input: {
      flex: 1,
      ...typography.bodyLarge,
      color: colors.textPrimary,
      paddingVertical: spacing.lg,
      paddingRight: spacing.sm,
    },
    clearButton: {
      width: 28,
      height: 28,
      borderRadius: radius.full,
      alignItems: 'center',
      justifyContent: 'center',
    },
    footerRow: {
      marginTop: spacing.sm,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
    },
    footerText: {
      ...typography.bodyMedium,
      color: colors.textSecondary,
    },
    footerLink: {
      ...typography.bodyMedium,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    footerLinkDark: {
      color: colors.primary,
    },
  });
