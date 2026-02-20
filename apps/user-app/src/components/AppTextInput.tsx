import React, { useState } from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { radius } from '@/constants/radius';
import { spacing } from '@/constants/spacing';
import { fontFamily } from '@/constants/typography';
import { useResolvedThemeMode, useThemeColors } from '@/theme';

export type InputKeyboardType =
  | 'default'
  | 'numeric'
  | 'phone-pad'
  | 'email-address';

type MaterialIconName = React.ComponentProps<typeof MaterialIcons>['name'];

export interface AppTextInputProps {
  label?: string;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  leftIcon?: MaterialIconName;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
  error?: string;
  secureTextEntry?: boolean;
  keyboardType?: InputKeyboardType;
  maxLength?: number;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  onBlur?: TextInputProps['onBlur'];
  onFocus?: TextInputProps['onFocus'];
  autoCapitalize?: TextInputProps['autoCapitalize'];
  autoCorrect?: boolean;
  returnKeyType?: TextInputProps['returnKeyType'];
}

const LIGHT_INPUT_BG = '#f9fafb'; // gray-50
const DARK_INPUT_BG = 'rgba(31, 41, 55, 0.5)'; // gray-800/50
const DARK_INPUT_BG_FOCUSED = '#1f2937'; // gray-800
const PLACEHOLDER = '#9ca3af'; // gray-400

export function AppTextInput({
  label,
  placeholder,
  value,
  onChangeText,
  leftIcon,
  rightIcon,
  onRightIconPress,
  error,
  secureTextEntry,
  keyboardType = 'default',
  maxLength,
  disabled = false,
  style,
  inputStyle,
  onBlur,
  onFocus,
  autoCapitalize = 'none',
  autoCorrect = false,
  returnKeyType,
}: AppTextInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const colors = useThemeColors();
  const mode = useResolvedThemeMode();
  const styles = createStyles(colors, mode);

  const hasError = Boolean(error);
  const showLeftIcon = Boolean(leftIcon);
  const showRightIcon = Boolean(rightIcon);

  return (
    <View style={[styles.container, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <View
        style={[
          styles.field,
          isFocused && styles.fieldFocused,
          hasError && styles.fieldError,
          disabled && styles.fieldDisabled,
        ]}
      >
        {showLeftIcon ? (
          <MaterialIcons
            name={leftIcon as MaterialIconName}
            size={20}
            color={hasError ? colors.error : colors.textMuted}
            style={styles.leftIcon}
          />
        ) : null}

        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={PLACEHOLDER}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          maxLength={maxLength}
          editable={!disabled}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          returnKeyType={returnKeyType}
          onFocus={(e) => {
            setIsFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            onBlur?.(e);
          }}
          style={[
            styles.input,
            showLeftIcon && styles.inputWithLeftIcon,
            showRightIcon && styles.inputWithRightIcon,
            inputStyle,
          ]}
        />

        {showRightIcon ? (
          onRightIconPress ? (
            <Pressable onPress={onRightIconPress} hitSlop={8} style={styles.rightIconPressable}>
              {rightIcon}
            </Pressable>
          ) : (
            <View style={styles.rightIcon}>{rightIcon}</View>
          )
        ) : null}
      </View>

      {hasError ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>, mode: 'light' | 'dark') =>
  StyleSheet.create({
    container: {
      width: '100%',
    },
    label: {
      marginBottom: spacing.sm,
      color: colors.textPrimary,
      fontSize: 14,
      lineHeight: 20,
      fontFamily: fontFamily.semibold,
      fontWeight: '600',
    },
    field: {
      minHeight: 56,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: mode === 'dark' ? colors.borderDark : colors.borderLight,
      backgroundColor: mode === 'dark' ? DARK_INPUT_BG : LIGHT_INPUT_BG,
      justifyContent: 'center',
    },
    fieldFocused: {
      borderWidth: 2,
      borderColor: colors.primary,
      backgroundColor: mode === 'dark' ? DARK_INPUT_BG_FOCUSED : colors.surfaceLight,
    },
    fieldError: {
      borderWidth: 2,
      borderColor: colors.error,
    },
    fieldDisabled: {
      opacity: 0.6,
    },
    input: {
      color: colors.textPrimary,
      fontSize: 16,
      lineHeight: 24,
      fontFamily: fontFamily.regular,
      fontWeight: '400',
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.lg,
    },
    inputWithLeftIcon: {
      paddingLeft: 48,
    },
    inputWithRightIcon: {
      paddingRight: 48,
    },
    leftIcon: {
      position: 'absolute',
      left: spacing.lg,
      zIndex: 1,
    },
    rightIcon: {
      position: 'absolute',
      right: spacing.lg,
      zIndex: 1,
    },
    rightIconPressable: {
      position: 'absolute',
      right: spacing.lg,
      zIndex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    errorText: {
      marginTop: spacing.sm,
      color: colors.error,
      fontSize: 12,
      lineHeight: 16,
      fontFamily: fontFamily.regular,
      fontWeight: '400',
    },
  });

export default AppTextInput;
