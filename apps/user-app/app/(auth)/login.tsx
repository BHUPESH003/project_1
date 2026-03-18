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
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useResolvedThemeMode, useThemeColors, useThemedStyles } from '@/theme';
import { useAuthStore } from '@/store/auth.store';
import { toE164 } from '@/utils/phone';
import { showToast } from '@/lib/toast';

const PHONE_PLACEHOLDER = '000 000 0000';

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
      await requestOtp(toE164(digitsOnly, '91'));
      router.push({ pathname: '/(auth)/verify-otp', params: { phone: toE164(digitsOnly, '91') } });
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
  };

  const handleInputBlur = () => {
    setIsInputFocused(false);
    if (digitsOnly.length > 0 && digitsOnly.length < 10) {
      setPhoneError('Please enter a valid 10-digit phone number');
    } else {
      setPhoneError(null);
    }
  };

  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          onScrollBeginDrag={Keyboard.dismiss}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Header Bar */}
          <View style={styles.header}>
            <Pressable
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/auth-unified'))}
              hitSlop={10}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </Pressable>
            <Text style={styles.headerTitle}>Local Shop</Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Illustration */}
          <View style={styles.illustrationContainer}>
             {/* Using a placeholder view for the illustration instead of a random image link to match structure without broken links */}
            <View style={styles.illustrationPlaceholder}>
                <Image 
                  source={{ uri: 'https://cdn-icons-png.flaticon.com/512/2953/2953363.png' }} 
                  style={{ width: 120, height: 120, opacity: 0.8 }} 
                  resizeMode="contain" 
                  tintColor={colors.primaryDark}
                />
            </View>
          </View>

          {/* Text Content */}
          <View style={styles.textContent}>
            <Text style={styles.title}>Speedy Access</Text>
            <Text style={styles.subtitle}>
              Enter your number to get shopping instantly.
            </Text>
          </View>

          {showValidationError ? <Text style={styles.errorText}>{phoneError}</Text> : null}
          {!showValidationError && error ? <Text style={styles.errorText}>{error}</Text> : null}

          {/* Input Section */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Mobile Number</Text>
            <View style={styles.inputRow}>
              {/* Country Code Dropdown */}
              <View style={styles.countryDropdown}>
                <Image source={{ uri: 'https://flagcdn.com/w40/in.png' }} style={styles.flagIcon} />
                <Text style={styles.countryCode}>+91</Text>
                <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
              </View>

              {/* Phone Input */}
              <View
                style={[
                  styles.inputWrap,
                  isInputFocused && styles.inputWrapFocused,
                  showValidationError && styles.inputWrapError,
                ]}
              >
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
              </View>
            </View>
          </View>

          {/* Send OTP Button */}
          <Pressable
            style={[styles.primaryButton, (!canSubmit || isLoading) && styles.primaryButtonDisabled]}
            onPress={handleContinue}
            disabled={!canSubmit || isLoading}
          >
            <Text style={styles.primaryButtonText}>
              {isLoading ? 'Sending...' : 'Send OTP'}
            </Text>
          </Pressable>

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
      justifyContent: 'space-between',
      marginBottom: 32,
    },
    closeButton: {
      padding: 4,
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    illustrationContainer: {
      alignItems: 'center',
      marginBottom: 32,
    },
    illustrationPlaceholder: {
      width: '100%',
      aspectRatio: 1.2,
      backgroundColor: '#FEF0D6',
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    textContent: {
      marginBottom: 24,
    },
    title: {
      fontSize: 32,
      fontWeight: 'bold',
      color: colors.textPrimary,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      color: colors.textSecondary,
      lineHeight: 24,
    },
    errorText: {
      fontSize: 14,
      color: colors.error,
      marginBottom: 12,
    },
    inputSection: {
      marginBottom: 24,
    },
    inputLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: 8,
    },
    inputRow: {
      flexDirection: 'row',
      gap: 12,
    },
    countryDropdown: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.borderLight,
      borderRadius: 12,
      paddingHorizontal: 12,
      height: 56,
      gap: 8,
    },
    flagIcon: {
      width: 24,
      height: 16,
      borderRadius: 2,
    },
    countryCode: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    inputWrap: {
      flex: 1,
      height: 56,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.borderLight,
      backgroundColor: colors.background,
      justifyContent: 'center',
      paddingHorizontal: 16,
    },
    inputWrapFocused: {
      borderColor: colors.primary,
    },
    inputWrapError: {
      borderColor: colors.error,
    },
    input: {
      fontSize: 16,
      color: colors.textPrimary,
      letterSpacing: 1,
    },
    primaryButton: {
      backgroundColor: colors.primary,
      height: 56,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 32,
    },
    primaryButtonDisabled: {
      opacity: 0.7,
    },
    primaryButtonText: {
      color: '#fff',
      fontSize: 18,
      fontWeight: '700',
    },
    separatorContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 24,
    },
    separatorLine: {
      flex: 1,
      height: 1,
      backgroundColor: colors.borderLight,
    },
    separatorText: {
      marginHorizontal: 16,
      fontSize: 12,
      fontWeight: '600',
      color: colors.textMuted,
      letterSpacing: 1,
    },
    socialRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 20,
      marginBottom: 40,
    },
    socialIconBtn: {
      width: 56,
      height: 56,
      borderRadius: 56,
      borderWidth: 1,
      borderColor: colors.borderLight,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
    },
    socialImage: {
      width: 24,
      height: 24,
    },
    footerRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
    },
    footerText: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    footerLink: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.primary,
    },
  });
