import React from 'react';
import { Text, StyleSheet, type TextProps, type TextStyle } from 'react-native';
import { useColors } from '@/theme';
import { typographyVariants, type TypographyVariant } from '@/theme/typography';

interface AppTextProps extends TextProps {
  variant?: TypographyVariant;
  color?: string;
  align?: TextStyle['textAlign'];
  children: React.ReactNode;
}

export function AppText({
  variant = 'body',
  color,
  align,
  style,
  children,
  ...rest
}: AppTextProps) {
  const colors = useColors();
  const variantStyle = typographyVariants[variant];

  return (
    <Text
      style={[
        variantStyle,
        { color: color ?? colors.text },
        align ? { textAlign: align } : undefined,
        style,
      ]}
      {...rest}
    >
      {children}
    </Text>
  );
}
