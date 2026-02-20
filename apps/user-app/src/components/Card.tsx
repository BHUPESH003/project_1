import React from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { getShadowPresets } from '@/constants/elevation';
import { radius } from '@/constants/radius';
import { spacing } from '@/constants/spacing';
import { useResolvedThemeMode, useThemeColors } from '@/theme';

export type CardVariant = 'elevated' | 'outlined' | 'filled';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

export interface CardProps {
  variant?: CardVariant;
  padding?: CardPadding;
  onPress?: () => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

const PADDING_MAP: Record<CardPadding, number> = {
  none: 0,
  sm: spacing.sm,
  md: spacing.lg,
  lg: spacing.xl,
};

export function Card({
  variant = 'elevated',
  padding = 'md',
  onPress,
  children,
  style,
}: CardProps) {
  const colors = useThemeColors();
  const mode = useResolvedThemeMode();
  const shadow = getShadowPresets(colors);

  const variantStyle = getVariantStyle(variant, mode, colors, shadow);
  const baseStyle: StyleProp<ViewStyle> = [
    styles.base,
    { padding: PADDING_MAP[padding] },
    variantStyle,
    style,
  ];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          baseStyle,
          pressed ? styles.pressed : null,
        ]}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={baseStyle}>{children}</View>;
}

function getVariantStyle(
  variant: CardVariant,
  mode: 'light' | 'dark',
  colors: ReturnType<typeof useThemeColors>,
  shadow: ReturnType<typeof getShadowPresets>
): ViewStyle {
  switch (variant) {
    case 'outlined':
      return {
        backgroundColor: mode === 'dark' ? colors.surfaceDark : colors.surfaceLight,
        borderWidth: 1,
        borderColor: mode === 'dark' ? colors.borderDark : colors.borderLight,
      };
    case 'filled':
      return {
        backgroundColor: mode === 'dark' ? colors.surfaceMuted : '#f9fafb',
      };
    case 'elevated':
    default:
      return {
        backgroundColor: mode === 'dark' ? colors.surfaceDark : colors.surfaceLight,
        ...shadow.sm,
      };
  }
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius['2xl'],
  },
  pressed: {
    opacity: 0.94,
    transform: [{ scale: 0.995 }],
  },
});

export default Card;
