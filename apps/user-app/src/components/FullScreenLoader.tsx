import React from 'react';
import {
  Modal,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { Spinner } from '@/components/Spinner';
import { spacing } from '@/constants/spacing';
import { fontFamily } from '@/constants/typography';
import { useResolvedThemeMode, useThemeColors } from '@/theme';

export interface FullScreenLoaderProps {
  visible?: boolean;
  message?: string;
  style?: StyleProp<ViewStyle>;
}

export function FullScreenLoader({
  visible = true,
  message,
  style,
}: FullScreenLoaderProps) {
  const colors = useThemeColors();
  const mode = useResolvedThemeMode();
  const styles = createStyles(colors.textSecondary, mode);

  if (!visible) {
    return null;
  }

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={[styles.overlay, style]}>
        <View style={styles.content}>
          <Spinner size="lg" />
          {message ? <Text style={styles.message}>{message}</Text> : null}
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (textSecondary: string, mode: 'light' | 'dark') =>
  StyleSheet.create({
    overlay: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: mode === 'dark' ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.25)',
    },
    content: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.lg,
      paddingHorizontal: spacing['3xl'],
      paddingVertical: spacing['2xl'],
    },
    message: {
      color: textSecondary,
      fontSize: 14,
      lineHeight: 20,
      fontFamily: fontFamily.medium,
      fontWeight: '500',
      textAlign: 'center',
    },
  });

export default FullScreenLoader;
