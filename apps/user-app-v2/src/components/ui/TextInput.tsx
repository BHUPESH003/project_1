import React, { useState, useRef } from 'react';
import {
  View,
  TextInput as RNTextInput,
  Text,
  StyleSheet,
  Animated,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { useColors } from '@/theme';
import { spacing, radius } from '@/theme/spacing';
import { fontSize, fontWeight } from '@/theme/typography';

interface AppTextInputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  inputHeight?: number;
}

export function AppTextInput({
  label,
  error,
  containerStyle,
  inputHeight = 52,
  style,
  ...rest
}: AppTextInputProps) {
  const colors = useColors();
  const [focused, setFocused] = useState(false);
  const borderAnim = useRef(new Animated.Value(0)).current;

  function onFocus() {
    setFocused(true);
    Animated.timing(borderAnim, {
      toValue: 1,
      duration: 150,
      useNativeDriver: false,
    }).start();
    rest.onFocus?.({} as any);
  }

  function onBlur() {
    setFocused(false);
    Animated.timing(borderAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: false,
    }).start();
    rest.onBlur?.({} as any);
  }

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [error ? colors.danger : colors.border, colors.primary],
  });

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <Text style={[styles.label, { color: colors.text2 }]}>{label}</Text>
      ) : null}
      <Animated.View
        style={[
          styles.inputWrap,
          {
            height: inputHeight,
            backgroundColor: colors.surface,
            borderColor: error ? colors.danger : borderColor,
          },
        ]}
      >
        <RNTextInput
          style={[
            styles.input,
            { color: colors.text, fontSize: fontSize.bodyLg },
            style,
          ]}
          placeholderTextColor={colors.text3}
          onFocus={onFocus}
          onBlur={onBlur}
          {...rest}
        />
      </Animated.View>
      {error ? (
        <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  label: {
    fontSize: fontSize.subhead,
    fontWeight: fontWeight.semibold,
  },
  inputWrap: {
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
  },
  input: { flex: 1 },
  errorText: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
  },
});
