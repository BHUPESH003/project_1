import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  StyleSheet,
  TextInput,
  TextInputKeyPressEventData,
  NativeSyntheticEvent,
  View,
} from 'react-native';
import { radius } from '@/constants/radius';
import { spacing } from '@/constants/spacing';
import { fontFamily } from '@/constants/typography';
import { useResolvedThemeMode, useThemeColors } from '@/theme';

export interface OTPInputProps {
  length?: number;
  value: string;
  onChange: (code: string) => void;
  error?: boolean;
  autoFocus?: boolean;
}

const BOX_SIZE = 56;
const BOX_SIZE_COMPACT = 44;
const LIGHT_BG = '#f9fafb'; // gray-50
const DARK_BG = 'rgba(31, 41, 55, 0.5)'; // gray-800/50

export function OTPInput({
  length = 4,
  value,
  onChange,
  error = false,
  autoFocus = false,
}: OTPInputProps) {
  const colors = useThemeColors();
  const mode = useResolvedThemeMode();
  const boxSize = length > 4 ? BOX_SIZE_COMPACT : BOX_SIZE;
  const fontSize = length > 4 ? 20 : 24;
  const lineHeight = length > 4 ? 24 : 28;
  const [focusedIndex, setFocusedIndex] = useState(0);
  const shake = useRef(new Animated.Value(0)).current;
  const prevError = useRef(error);
  const inputRefs = useRef<Array<TextInput | null>>([]);

  const digits = useMemo(() => {
    const normalized = value.replace(/\D/g, '').slice(0, length);
    return Array.from({ length }, (_, i) => normalized[i] ?? '');
  }, [value, length]);

  useEffect(() => {
    if (autoFocus) {
      const timer = setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [autoFocus]);

  useEffect(() => {
    if (error && !prevError.current) {
      Animated.sequence([
        Animated.timing(shake, { toValue: 8, duration: 40, useNativeDriver: true }),
        Animated.timing(shake, { toValue: -8, duration: 40, useNativeDriver: true }),
        Animated.timing(shake, { toValue: 6, duration: 35, useNativeDriver: true }),
        Animated.timing(shake, { toValue: -6, duration: 35, useNativeDriver: true }),
        Animated.timing(shake, { toValue: 0, duration: 35, useNativeDriver: true }),
      ]).start();
    }
    prevError.current = error;
  }, [error, shake]);

  const focusAt = (index: number) => {
    if (index < 0 || index >= length) return;
    inputRefs.current[index]?.focus();
    setFocusedIndex(index);
  };

  const updateDigits = (nextDigits: string[]) => {
    onChange(nextDigits.join('').slice(0, length));
  };

  const handleChangeAt = (index: number, rawText: string) => {
    const sanitized = rawText.replace(/\D/g, '');
    if (sanitized.length === 0) {
      const next = [...digits];
      next[index] = '';
      updateDigits(next);
      return;
    }

    // Paste support: distribute all entered digits from the current box onward.
    const next = [...digits];
    const chars = sanitized.split('');
    let lastFilled = index;

    for (let offset = 0; offset < chars.length && index + offset < length; offset += 1) {
      next[index + offset] = chars[offset];
      lastFilled = index + offset;
    }

    updateDigits(next);

    if (lastFilled < length - 1) {
      focusAt(lastFilled + 1);
    } else {
      inputRefs.current[lastFilled]?.blur();
    }
  };

  const handleKeyPress = (
    index: number,
    e: NativeSyntheticEvent<TextInputKeyPressEventData>
  ) => {
    if (e.nativeEvent.key !== 'Backspace') return;

    if (digits[index]) {
      const next = [...digits];
      next[index] = '';
      updateDigits(next);
      return;
    }

    const prevIndex = index - 1;
    if (prevIndex >= 0) {
      const next = [...digits];
      next[prevIndex] = '';
      updateDigits(next);
      focusAt(prevIndex);
    }
  };

  const styles = createStyles(colors, mode, boxSize, fontSize, lineHeight);

  return (
    <Animated.View style={[styles.row, { transform: [{ translateX: shake }] }]}>
      {Array.from({ length }).map((_, index) => {
        const isFocused = focusedIndex === index;
        return (
          <View
            key={`otp-${index}`}
            style={[
              styles.box,
              isFocused && styles.boxFocused,
              error && styles.boxError,
            ]}
          >
            <TextInput
              ref={(ref) => {
                inputRefs.current[index] = ref;
              }}
              value={digits[index]}
              onChangeText={(text) => handleChangeAt(index, text)}
              onKeyPress={(e) => handleKeyPress(index, e)}
              onFocus={() => setFocusedIndex(index)}
              keyboardType="number-pad"
              returnKeyType="done"
              textContentType="oneTimeCode"
              autoComplete="sms-otp"
              maxLength={Math.max(length, 8)}
              style={styles.input}
              selectionColor={colors.primary}
            />
          </View>
        );
      })}
    </Animated.View>
  );
}

const createStyles = (
  colors: ReturnType<typeof useThemeColors>,
  mode: 'light' | 'dark',
  boxSize: number,
  fontSize: number,
  lineHeight: number
) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
    },
    box: {
      width: boxSize,
      height: boxSize,
      borderRadius: radius['2xl'],
      borderWidth: 1,
      borderColor: mode === 'dark' ? colors.borderDark : colors.borderLight,
      backgroundColor: mode === 'dark' ? DARK_BG : LIGHT_BG,
      justifyContent: 'center',
      alignItems: 'center',
    },
    boxFocused: {
      borderWidth: 2,
      borderColor: colors.primary,
    },
    boxError: {
      borderWidth: 2,
      borderColor: colors.error,
    },
    input: {
      width: '100%',
      height: '100%',
      textAlign: 'center',
      color: colors.textPrimary,
      fontSize,
      lineHeight,
      fontFamily: fontFamily.bold,
      fontWeight: '700',
      padding: 0,
    },
  });

export default OTPInput;
