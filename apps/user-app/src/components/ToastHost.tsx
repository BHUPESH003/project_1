import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Toast, { ToastConfig, ToastConfigParams } from 'react-native-toast-message';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { getShadowPresets } from '@/constants/elevation';
import { radius } from '@/constants/radius';
import { spacing } from '@/constants/spacing';
import { fontFamily } from '@/constants/typography';
import { useResolvedThemeMode, useThemeColors } from '@/theme';

export type AppToastType = 'success' | 'error' | 'info' | 'warning';

export interface AppToastProps {
  actionLabel?: string;
  onAction?: () => void;
}

interface ToastTypeStyle {
  accent: string;
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
}

function getToastTypeStyle(type: AppToastType, colors: ReturnType<typeof useThemeColors>): ToastTypeStyle {
  switch (type) {
    case 'error':
      return { accent: colors.error, icon: 'error' };
    case 'info':
      return { accent: colors.info, icon: 'info' };
    case 'warning':
      return { accent: colors.warning, icon: 'warning' };
    case 'success':
    default:
      return { accent: colors.success, icon: 'check-circle' };
  }
}

function ToastItem({
  type,
  text1,
  text2,
  props,
  onPress,
}: ToastConfigParams<AppToastProps> & { type: AppToastType }) {
  const colors = useThemeColors();
  const mode = useResolvedThemeMode();
  const shadow = getShadowPresets(colors);
  const style = getToastTypeStyle(type, colors);

  return (
    <Pressable onPress={onPress} style={[styles.container, shadow.md, { backgroundColor: mode === 'dark' ? 'rgba(21, 42, 42, 0.96)' : 'rgba(255,255,255,0.96)' }]}>
      <View style={[styles.accent, { backgroundColor: style.accent }]} />
      <View style={styles.iconWrap}>
        <MaterialIcons name={style.icon} size={20} color={style.accent} />
      </View>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={2}>
          {text1}
        </Text>
        {text2 ? (
          <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={2}>
            {text2}
          </Text>
        ) : null}
      </View>
      {props?.actionLabel ? (
        <Pressable style={styles.action} onPress={props.onAction} hitSlop={8}>
          <Text style={[styles.actionLabel, { color: colors.primary }]}>{props.actionLabel}</Text>
        </Pressable>
      ) : null}
    </Pressable>
  );
}

export function ToastHost() {
  const insets = useSafeAreaInsets();

  const config: ToastConfig = {
    success: (params) => <ToastItem {...params} type="success" />,
    error: (params) => <ToastItem {...params} type="error" />,
    info: (params) => <ToastItem {...params} type="info" />,
    warning: (params) => <ToastItem {...params} type="warning" />,
  };

  return (
    <Toast
      config={config}
      position="top"
      topOffset={Math.max(insets.top + spacing.md, 48)}
      visibilityTime={3000}
      autoHide
      swipeable
    />
  );
}

const styles = StyleSheet.create({
  container: {
    width: '92%',
    alignSelf: 'center',
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 64,
  },
  accent: {
    width: 4,
    alignSelf: 'stretch',
  },
  iconWrap: {
    marginLeft: spacing.lg,
    marginRight: spacing.md,
  },
  content: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingRight: spacing.sm,
  },
  title: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: fontFamily.semibold,
    fontWeight: '600',
  },
  description: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: fontFamily.regular,
    fontWeight: '400',
  },
  action: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  actionLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: fontFamily.semibold,
    fontWeight: '600',
  },
});

export default ToastHost;
