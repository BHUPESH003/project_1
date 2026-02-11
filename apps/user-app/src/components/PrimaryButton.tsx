/**
 * PrimaryButton – full-width primary CTA.
 * Polish: spacing scale, typography, elevation, press feedback (activeOpacity).
 */
import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '../constants/colors';
import { spacing } from '../constants/spacing';
import { typography } from '../constants/typography';
import { elevation } from '../constants/elevation';

export interface PrimaryButtonProps {
  label: string;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
}

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  label,
  disabled = false,
  icon,
  style,
  onPress,
}) => {
  return (
    <TouchableOpacity
      style={[styles.button, disabled && styles.buttonDisabled, elevation.button, style]}
      activeOpacity={0.92}
      disabled={disabled}
      onPress={onPress}
    >
      {icon != null && <View style={styles.iconWrap}>{icon}</View>}
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
    minHeight: 48,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  iconWrap: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    ...typography.primary,
    fontWeight: '700',
    color: colors.textPrimary,
  },
});

export default PrimaryButton;
