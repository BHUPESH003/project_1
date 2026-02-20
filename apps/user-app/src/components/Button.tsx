import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { radius } from '@/constants/radius';
import { spacing } from '@/constants/spacing';
import { fontFamily } from '@/constants/typography';
import { getShadowPresets } from '@/constants/elevation';
import { useResolvedThemeMode, useThemeColors } from '@/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children?: React.ReactNode;

  // Backward-compatibility
  title?: string;
  isLoading?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

interface VariantStyle {
  backgroundColor: string;
  textColor: string;
  borderColor?: string;
  borderWidth?: number;
  shadowStyle?: ViewStyle;
  pressedBackgroundColor?: string;
}

interface SizeStyle {
  minHeight: number;
  paddingVertical: number;
  paddingHorizontal: number;
  fontSize: number;
}

const SECONDARY_LIGHT = '#f3f4f6'; // gray-100
const SECONDARY_DARK = '#1f2937'; // gray-800

const SIZE_STYLES: Record<ButtonSize, SizeStyle> = {
  sm: {
    minHeight: 40,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    fontSize: 14,
  },
  md: {
    minHeight: 48,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    fontSize: 16,
  },
  lg: {
    minHeight: 56,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing['2xl'],
    fontSize: 18,
  },
};

export const Button: React.FC<ButtonProps> = ({
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  children,
  title,
  isLoading,
  style,
  textStyle,
}) => {
  const colors = useThemeColors();
  const resolvedMode = useResolvedThemeMode();
  const shadow = getShadowPresets(colors);
  const isLoadingResolved = loading || isLoading || false;
  const isDisabled = disabled || isLoadingResolved;

  const sizeStyle = SIZE_STYLES[size];
  const variantStyle = getVariantStyle(variant, resolvedMode, colors, shadow);
  const label = children ?? title ?? '';
  const isTextLabel = typeof label === 'string' || typeof label === 'number';

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        {
          width: fullWidth ? '100%' : undefined,
          minHeight: sizeStyle.minHeight,
          paddingVertical: sizeStyle.paddingVertical,
          paddingHorizontal: sizeStyle.paddingHorizontal,
          backgroundColor:
            pressed && !isDisabled && variantStyle.pressedBackgroundColor
              ? variantStyle.pressedBackgroundColor
              : variantStyle.backgroundColor,
          borderColor: variantStyle.borderColor,
          borderWidth: variantStyle.borderWidth ?? 0,
          transform:
            pressed && !isDisabled
              ? [{ scale: variant === 'primary' ? 0.98 : 0.99 }]
              : [{ scale: 1 }],
          opacity: isDisabled ? 0.5 : 1,
        },
        variantStyle.shadowStyle,
        style,
      ]}
    >
      <View style={styles.content}>
        {leftIcon ? <View style={styles.iconLeft}>{leftIcon}</View> : null}

        {isLoadingResolved ? (
          <ActivityIndicator size="small" color={variantStyle.textColor} />
        ) : !isTextLabel ? (
          label
        ) : (
          <Text
            style={[
              styles.text,
              {
                color: variantStyle.textColor,
                fontSize: sizeStyle.fontSize,
              },
              textStyle,
            ]}
            numberOfLines={1}
          >
            {label}
          </Text>
        )}

        {rightIcon ? <View style={styles.iconRight}>{rightIcon}</View> : null}
      </View>
    </Pressable>
  );
};

function getVariantStyle(
  variant: ButtonVariant,
  resolvedMode: 'light' | 'dark',
  colors: ReturnType<typeof useThemeColors>,
  shadow: ReturnType<typeof getShadowPresets>
): VariantStyle {
  switch (variant) {
    case 'secondary':
      return {
        backgroundColor: resolvedMode === 'dark' ? SECONDARY_DARK : SECONDARY_LIGHT,
        textColor: resolvedMode === 'dark' ? colors.textLight : colors.textPrimary,
        shadowStyle: shadow.none,
      };
    case 'outline':
      return {
        backgroundColor: 'transparent',
        textColor: colors.primary,
        borderColor: colors.primary,
        borderWidth: 1,
        shadowStyle: shadow.none,
      };
    case 'ghost':
      return {
        backgroundColor: 'transparent',
        textColor: colors.primary,
        shadowStyle: shadow.none,
      };
    case 'danger':
      return {
        backgroundColor: colors.error,
        textColor: colors.textLight,
        shadowStyle: shadow.none,
      };
    case 'primary':
    default:
      return {
        backgroundColor: colors.primary,
        textColor: colors.textDark,
        shadowStyle: shadow.glow,
        pressedBackgroundColor: colors.primaryDark,
      };
  }
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  text: {
    fontFamily: fontFamily.bold,
    fontWeight: '700',
    textAlign: 'center',
  },
  iconLeft: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconRight: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default Button;
