import React from 'react';
import {
  Text as RNText,
  TextProps as RNTextProps,
  StyleProp,
  TextStyle,
} from 'react-native';
import { typography, TypographyVariant } from '@/constants/typography';
import { useThemeColors } from '@/theme';

export interface AppTextProps extends RNTextProps {
  variant?: TypographyVariant;
  color?: string;
  style?: StyleProp<TextStyle>;
}

export function AppText({
  variant = 'bodyMedium',
  color,
  style,
  children,
  ...props
}: AppTextProps) {
  const colors = useThemeColors();
  const resolvedColor = color ?? (variant === 'caption' ? colors.textMuted : undefined);

  return (
    <RNText
      {...props}
      style={[typography[variant], resolvedColor ? { color: resolvedColor } : null, style]}
    >
      {children}
    </RNText>
  );
}

export default AppText;
