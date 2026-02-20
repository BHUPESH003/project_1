/**
 * Loader Component
 * Centered loading spinner for full-screen loading states
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useThemeColors, useThemedStyles } from '@/theme';
import { Spinner } from '@/components/Spinner';

interface LoaderProps {
  size?: 'small' | 'large';
  color?: string;
}

export const Loader: React.FC<LoaderProps> = ({
  size = 'large',
  color,
}) => {
  const colors = useThemeColors();
  const styles = useThemedStyles(createStyles);
  const spinnerColor = color ?? colors.primary;

  return (
    <View style={styles.container}>
      <Spinner size={size === 'small' ? 'sm' : 'lg'} color={spinnerColor} />
    </View>
  );
};

const createStyles = (_colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });

export default Loader;
