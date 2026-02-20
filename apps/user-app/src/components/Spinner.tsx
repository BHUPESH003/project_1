import React from 'react';
import { ActivityIndicator } from 'react-native';
import { useThemeColors } from '@/theme';

export type SpinnerSize = 'sm' | 'md' | 'lg' | number;

export interface SpinnerProps {
  size?: SpinnerSize;
  color?: string;
}

const SIZE_MAP = {
  sm: 16,
  md: 24,
  lg: 32,
} as const;

function resolveSize(size: SpinnerSize): number {
  return typeof size === 'number' ? size : SIZE_MAP[size];
}

export function Spinner({ size = 'md', color }: SpinnerProps) {
  const colors = useThemeColors();

  return (
    <ActivityIndicator
      size={resolveSize(size)}
      color={color ?? colors.primary}
    />
  );
}

export default Spinner;
