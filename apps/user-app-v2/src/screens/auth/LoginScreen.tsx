import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
  Pressable,
  Platform,
  Keyboard,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { type NativeStackScreenProps } from '@react-navigation/native-stack';
import LinearGradient from 'react-native-linear-gradient';
import { useColors } from '@/theme';
import { spacing, radius } from '@/theme/spacing';
import { fontSize, fontWeight } from '@/theme/typography';
import { useRequestOtp } from '@/api/hooks/useAuth';
import { showToast } from '@/stores/toastStore';
import { getErrorMessage } from '@/api/client';
import type { AuthStackParamList } from '@/navigation/AuthStack';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

const DIGITS_REGEX = /^\d*$/;

// Lightning bolt logo — simple SVG-free version using Text
function AppLogo() {
  const colors = useColors();
  return (
    <View style={[styles.logoBox, { backgroundColor: colors.primary }]}>
      <Text style={styles.logoIcon}>⚡</Text>
    </View>
  );
}

export function LoginScreen({ navigation }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [phone, setPhone] = useState('');
  const [focused, setFocused] = useState(false);
  const borderAnim = useRef(new Animated.Value(0)).current;
  const requestOtp = useRequestOtp();

  const digits = phone.replace(/\D/g, '');
  const isValid = digits.length === 10;
  const canSubmit = isValid && !requestOtp.isPending;

  function animateBorder(to: number) {
    Animated.timing(borderAnim, {
      toValue: to,
      duration: 160,
      useNativeDriver: false,
    }).start();
  }

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.border, colors.primary],
  });

  async function handleContinue() {
    if (!canSubmit) return;
    Keyboard.dismiss();
    try {
      await requestOtp.mutateAsync(`+91${digits}`);
      navigation.navigate('OTP', { phone: `+91${digits}` });
    } catch (err) {
      showToast({ type: 'error', message: getErrorMessage(err) });
    }
  }

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
            { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Logo */}
          <AppLogo />

          {/* Hero text */}
          <View style={styles.heroSection}>
            <Text style={[styles.headline, { color: colors.text }]}>
              {'Your neighborhood,\non tap'}
            </Text>
            <Text style={[styles.subline, { color: colors.text2 }]}>
              Printing, stationery, gifts &amp; more{'\n'}from shops near you.
            </Text>
          </View>

          {/* Phone input */}
          <View style={styles.inputSection}>
            <Text style={[styles.inputLabel, { color: colors.text2 }]}>Phone number</Text>
            <Animated.View
              style={[
                styles.inputRow,
                {
                  backgroundColor: colors.surface,
                  borderColor,
                },
              ]}
            >
              {/* Country selector (static +91) */}
              <View style={[styles.countryChip, { borderRightColor: colors.border }]}>
                <Text style={styles.flag}>🇮🇳</Text>
                <Text style={[styles.countryCode, { color: colors.text }]}>+91</Text>
                <Text style={[styles.chevron, { color: colors.text3 }]}>›</Text>
              </View>

              {/* Number input */}
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="XXXXX  XXXXX"
                placeholderTextColor={colors.text3}
                keyboardType="number-pad"
                maxLength={10}
                value={phone}
                onChangeText={(t) => DIGITS_REGEX.test(t) && setPhone(t)}
                onFocus={() => { setFocused(true); animateBorder(1); }}
                onBlur={() =>  { setFocused(false); animateBorder(0); }}
                returnKeyType="done"
                onSubmitEditing={handleContinue}
                editable={!requestOtp.isPending}
              />
            </Animated.View>
          </View>

          {/* Continue button */}
          <Pressable
            onPress={handleContinue}
            disabled={!canSubmit}
            style={({ pressed }) => [styles.ctaWrapper, pressed && { opacity: 0.9 }]}
          >
            <LinearGradient
              colors={canSubmit ? ['#14b8c4', '#0b8a93'] : [colors.border, colors.border]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.cta, !canSubmit && styles.ctaDisabled]}
            >
              <Text style={[styles.ctaText, { color: canSubmit ? '#fff' : colors.text3 }]}>
                {requestOtp.isPending ? 'Sending…' : 'Continue'}
              </Text>
            </LinearGradient>
          </Pressable>

          {/* Terms */}
          <Text style={[styles.terms, { color: colors.text3 }]}>
            By continuing, you agree to our{' '}
            <Text style={{ color: colors.primary }}>Terms</Text>
            {' '}and{' '}
            <Text style={{ color: colors.primary }}>Privacy Policy</Text>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex:   { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    gap: spacing['3xl'],
  },

  // Logo
  logoBox: {
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  logoIcon: { fontSize: 28 },

  // Hero
  heroSection: { gap: spacing.md },
  headline: {
    fontSize: fontSize.displayLg,
    fontWeight: fontWeight.bold,
    lineHeight: 42,
    letterSpacing: -0.5,
  },
  subline: {
    fontSize: fontSize.body,
    lineHeight: 22,
  },

  // Input
  inputSection: { gap: spacing.sm },
  inputLabel: {
    fontSize: fontSize.subhead,
    fontWeight: fontWeight.semibold,
  },
  inputRow: {
    height: 56,
    borderRadius: radius.md,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  countryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRightWidth: 1,
    height: '100%',
  },
  flag: { fontSize: 20 },
  countryCode: {
    fontSize: fontSize.bodyLg,
    fontWeight: fontWeight.semibold,
  },
  chevron: { fontSize: 16 },
  input: {
    flex: 1,
    fontSize: fontSize.bodyLg,
    paddingHorizontal: spacing.md,
    letterSpacing: 2,
    fontVariant: ['tabular-nums'],
  },

  // CTA
  ctaWrapper: {},
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

  // Terms
  terms: {
    fontSize: fontSize.caption,
    textAlign: 'center',
    lineHeight: 18,
  },
});
