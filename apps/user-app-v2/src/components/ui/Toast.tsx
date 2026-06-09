import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToastStore, type ToastItem } from '@/stores/toastStore';
import { useColors } from '@/theme';
import { spacing, radius } from '@/theme/spacing';
import { fontSize, fontWeight } from '@/theme/typography';

function ToastCard({ toast }: { toast: ToastItem }) {
  const colors = useColors();
  const hide = useToastStore((s) => s.hide);
  const translateY = useRef(new Animated.Value(-80)).current;

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: 0,
      damping: 18,
      stiffness: 200,
      useNativeDriver: true,
    }).start();
  }, [translateY]);

  const { bg, accent } = toastColors(toast.type, colors);

  return (
    <Animated.View
      style={[
        styles.card,
        { backgroundColor: bg, borderLeftColor: accent, transform: [{ translateY }] },
      ]}
    >
      <View style={[styles.accent, { backgroundColor: accent }]} />
      <Text style={[styles.message, { color: colors.text }]} numberOfLines={3}>
        {toast.message}
      </Text>
      <TouchableOpacity onPress={() => hide(toast.id)} hitSlop={8}>
        <Text style={[styles.dismiss, { color: colors.text3 }]}>✕</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

export function ToastHost() {
  const toasts = useToastStore((s) => s.toasts);
  const insets = useSafeAreaInsets();

  if (toasts.length === 0) return null;

  return (
    <View style={[styles.host, { top: insets.top + spacing.sm }]} pointerEvents="box-none">
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} />
      ))}
    </View>
  );
}

function toastColors(type: ToastItem['type'], colors: ReturnType<typeof useColors>) {
  switch (type) {
    case 'success': return { bg: colors.successSoft, accent: colors.success };
    case 'error':   return { bg: colors.dangerSoft,  accent: colors.danger };
    case 'warning': return { bg: colors.warningSoft, accent: colors.warning };
    case 'info':
    default:        return { bg: colors.primarySoft, accent: colors.primary };
  }
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: spacing.xl,
    right: spacing.xl,
    zIndex: 9999,
    gap: spacing.sm,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  accent: { width: 3, height: '100%', borderRadius: 2, alignSelf: 'stretch' },
  message: { flex: 1, fontSize: fontSize.body, fontWeight: fontWeight.medium },
  dismiss: { fontSize: fontSize.bodyLg, fontWeight: fontWeight.bold },
});
