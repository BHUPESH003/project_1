import React from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  ActivityIndicator,
  type PressableProps,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useColors } from '@/theme';
import { spacing, radius } from '@/theme/spacing';
import { fontSize, fontWeight } from '@/theme/typography';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends Omit<PressableProps, 'style'> {
  variant?: ButtonVariant;
  label: string;
  loading?: boolean;
  fullWidth?: boolean;
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Button({
  variant = 'primary',
  label,
  loading = false,
  fullWidth = false,
  size = 'md',
  style,
  textStyle,
  disabled,
  onPress,
  ...rest
}: ButtonProps) {
  const colors = useColors();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  function handlePressIn() {
    scale.value = withSpring(0.97, { damping: 20, stiffness: 300 });
  }

  function handlePressOut() {
    scale.value = withSpring(1, { damping: 20, stiffness: 300 });
  }

  const isDisabled = disabled || loading;

  const containerStyle = [
    styles.base,
    sizeStyles[size],
    variantContainer(variant, colors),
    fullWidth && styles.fullWidth,
    isDisabled && styles.disabled,
    style,
  ];

  const labelStyle = [
    styles.label,
    sizeLabelStyles[size],
    variantLabel(variant, colors),
    isDisabled && styles.labelDisabled,
    textStyle,
  ];

  return (
    <AnimatedPressable
      style={[animatedStyle, containerStyle]}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isDisabled}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? colors.textOnPrimary : colors.primary}
        />
      ) : (
        <Text style={labelStyle}>{label}</Text>
      )}
    </AnimatedPressable>
  );
}

function variantContainer(v: ButtonVariant, colors: ReturnType<typeof useColors>): ViewStyle {
  switch (v) {
    case 'primary':
      return { backgroundColor: colors.primary };
    case 'secondary':
      return {
        backgroundColor: colors.primarySoft,
        borderWidth: 1,
        borderColor: colors.primarySoftBorder,
      };
    case 'ghost':
      return { backgroundColor: 'transparent' };
    case 'danger':
      return { backgroundColor: colors.danger };
  }
}

function variantLabel(v: ButtonVariant, colors: ReturnType<typeof useColors>): TextStyle {
  switch (v) {
    case 'primary':
      return { color: colors.textOnPrimary };
    case 'secondary':
      return { color: colors.onPrimarySoft };
    case 'ghost':
      return { color: colors.primary };
    case 'danger':
      return { color: '#fff' };
  }
}

const sizeStyles: Record<string, ViewStyle> = {
  sm: { height: 36, paddingHorizontal: spacing.lg, borderRadius: radius.sm },
  md: { height: 48, paddingHorizontal: spacing.xl, borderRadius: radius.md },
  lg: { height: 56, paddingHorizontal: spacing['2xl'], borderRadius: radius.lg },
};

const sizeLabelStyles: Record<string, TextStyle> = {
  sm: { fontSize: fontSize.subhead, fontWeight: fontWeight.semibold },
  md: { fontSize: fontSize.body,    fontWeight: fontWeight.semibold },
  lg: { fontSize: fontSize.bodyLg,  fontWeight: fontWeight.bold },
};

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  fullWidth: { width: '100%' },
  disabled:  { opacity: 0.55 },
  label: {},
  labelDisabled: {},
});
