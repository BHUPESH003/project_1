/**
 * Dark-theme screen container. Safe area + content padding so content never touches edges.
 */
import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing } from '@/constants/spacing';
import { useThemedStyles } from '@/theme';

/** Horizontal padding from screen edge (in addition to safe area). */
const SCREEN_HORIZONTAL_PADDING = spacing.lg;

interface ScreenWrapperProps {
  children: React.ReactNode;
  style?: ViewStyle;
  noPadding?: boolean;
}

export function ScreenWrapper({ children, style, noPadding }: ScreenWrapperProps) {
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(createStyles);
  const horizontalPadding = noPadding ? 0 : SCREEN_HORIZONTAL_PADDING;
  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          paddingLeft: insets.left + horizontalPadding,
          paddingRight: insets.right + horizontalPadding,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const createStyles = (colors: { background: string }) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
  });

export default ScreenWrapper;
