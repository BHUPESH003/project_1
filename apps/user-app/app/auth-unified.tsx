/**
 * Unified Landing & Login Screen
 *
 * Single screen that combines landing (hero, value prop) with login (phone input, OTP).
 * Dark background with white card container. Phone input only—no social login.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
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
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuthStore } from "@/store/auth.store";
import { toE164 } from "@/utils/phone";
import { showToast } from "@/lib/toast";
import { typography } from "@/constants/typography";
import { spacing } from "@/constants/spacing";
import { radius } from "@/constants/radius";
import { assets } from "@/constants/assets";
import { useThemedStyles } from "@/theme";
import { colors } from "@/constants/colors";

const PHONE_PLACEHOLDER = "Enter Phone Number";
const COUNTRY_CODE = "+91";

export default function AuthUnifiedScreen() {
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);

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

  const handleInputFocus = () => {
    setPhoneError(null);
  };

  const handleInputBlur = () => {
    if (digitsOnly.length > 0 && digitsOnly.length < 10) {
      setPhoneError('Please enter a valid 10-digit phone number');
    } else {
      setPhoneError(null);
    }
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>

      {/* Hero — completely static, never moves */}
      <View style={styles.bgImageContainer}>
        <View style={styles.imageWrapper}>
          <Image
            source={assets.images.heroBanner}
            style={styles.bgImage}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.heroTitle}>Get anything delivered in minutes.</Text>
      </View>

      {/* Only the card lifts when keyboard opens */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={insets.top}
      >
        <View style={[styles.card, { paddingBottom: insets.bottom + spacing.xl }]}>

          {/* Phone Input Section */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Log in or sign up</Text>

            {showValidationError ? (
              <Text style={styles.errorText}>{phoneError}</Text>
            ) : null}
            {!showValidationError && error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : null}

            {/* Phone Input Row */}
            <View style={styles.phoneInputRow}>
              <View style={styles.countryCodeContainer}>
                <Image
                  source={{ uri: 'https://cdn-icons-png.flaticon.com/512/197/197560.png' }}
                  style={styles.flagIcon}
                  resizeMode="contain"
                />
                <Text style={styles.countryCode}>{COUNTRY_CODE}</Text>
              </View>

              <TextInput
                style={styles.phoneInput}
                placeholder={PHONE_PLACEHOLDER}
                placeholderTextColor="#ccc"
                keyboardType="phone-pad"
                maxLength={14}
                value={phone}
                onChangeText={(text) => {
                  setPhone(text);
                  setPhoneError(null);
                }}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
                editable={!isLoading}
                selectTextOnFocus
              />
            </View>

            {/* Send OTP Button */}
            <Pressable
              style={[styles.sendOtpBtn, !canSubmit && styles.sendOtpBtnDisabled]}
              onPress={handleContinue}
              disabled={!canSubmit}
              android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
            >
              {isLoading ? (
                <MaterialCommunityIcons name="loading" size={20} color="#fff" />
              ) : (
                <Text style={styles.sendOtpBtnText}>Send OTP</Text>
              )}
            </Pressable>

            {/* Legal Text */}
            <Text style={styles.legalText}>
              By continuing, you agree to our Terms of Service, Privacy Policy, Contact Policy
            </Text>
          </View>

        </View>
      </KeyboardAvoidingView>

    </View>
  );
}
const createStyles = () =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.black,
    },
    flex: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 0,
      flexGrow: 1, 

    },
    bgImageContainer: {
      width: "100%",
      paddingBottom: spacing.xl,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.xl,
      alignItems: "center",
      justifyContent: "flex-start",
      gap: spacing.lg,
    },
    imageWrapper: {
      width: 250,
      height: 250,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    bgImage: {
      width: "100%",
      height: "100%",
    },
    heroTitle: {
      ...typography.displayMedium,
      fontSize: 42,
      fontWeight: "700",
      textAlign: "left",
      lineHeight: 48,
      color: colors.textLight,
    },
    card: {
      backgroundColor: colors.surfaceLight,
      borderRadius: 24,
      marginHorizontal: spacing.lg,
      marginTop: spacing.xl,
      marginBottom: spacing.lg,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.xl,
      gap: spacing.lg,
    },
    formSection: {
      gap: spacing.lg,
    },
    sectionTitle: {
      ...typography.screenTitle,
      fontSize: 18,
      fontWeight: "600",
      color: colors.black,
      marginBottom: spacing.md,
    },
    errorText: {
      ...typography.bodySmall,
      color: colors.error,
      marginBottom: spacing.xs,
    },
    phoneInputRow: {
      flexDirection: "row",
      borderWidth: 1,
      borderColor: colors.borderLight,
      borderRadius: radius.md,
      overflow: "hidden",
      alignItems: "center",
      backgroundColor: colors.surfaceLight,
      marginBottom: spacing.md,
    },
    countryCodeContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRightWidth: 1,
      borderRightColor: colors.borderLight,
      paddingVertical: spacing.md,
    },
    flagIcon: {
      width: 24,
      height: 18,
    },
    countryCode: {
      ...typography.bodyMedium,
      fontWeight: "600",
      color: colors.black,
    },
    phoneInput: {
      flex: 1,
      ...typography.bodyLarge,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      color: colors.black,
    },
    sendOtpBtn: {
      height: 52,
      borderRadius: radius.lg,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primary,
      marginTop: spacing.md,
      marginBottom: spacing.lg,
    },
    sendOtpBtnDisabled: {
      backgroundColor: colors.borderLight,
    },
    sendOtpBtnText: {
      ...typography.labelLarge,
      color: colors.textLight,
      fontWeight: "600",
    },
    legalText: {
      ...typography.bodySmall,
      textAlign: "center",
      lineHeight: 18,
      color: colors.textSecondary,
    },
  });
