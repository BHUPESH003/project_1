import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { type NativeStackScreenProps } from '@react-navigation/native-stack';
import { useColors } from '@/theme';
import { spacing, radius } from '@/theme/spacing';
import { fontSize, fontWeight } from '@/theme/typography';
import type { HomeStackParamList } from '@/navigation/HomeStack';

type Props = NativeStackScreenProps<HomeStackParamList, 'PaymentFailure'>;

export function PaymentFailureScreen({ route, navigation }: Props) {
  const { errorMessage } = route.params ?? {};
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.screen,
        { backgroundColor: colors.bg, paddingBottom: insets.bottom || spacing['3xl'] },
      ]}
    >
      <View style={styles.center}>
        {/* Error icon */}
        <View style={[styles.circle, { backgroundColor: colors.dangerSoft }]}>
          <Text style={styles.crossIcon}>✕</Text>
        </View>

        <View style={styles.textBlock}>
          <Text style={[styles.title, { color: colors.text }]}>Payment failed</Text>
          <Text style={[styles.subtitle, { color: colors.text2 }]}>
            {errorMessage ?? 'Something went wrong. Your order has not been placed.'}
          </Text>
        </View>

        <View style={[styles.infoCard, { backgroundColor: colors.warningSoft, borderColor: colors.warning }]}>
          <Text style={styles.infoIcon}>ℹ️</Text>
          <Text style={[styles.infoText, { color: colors.text2 }]}>
            If money was debited from your account, it will be refunded within 5–7 business days.
          </Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Pressable
          style={[styles.retryBtn, { backgroundColor: colors.primary }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={[styles.retryBtnText, { color: colors.textOnPrimary }]}>
            Try again
          </Text>
        </Pressable>

        <Pressable
          style={[styles.homeBtn, { borderColor: colors.border }]}
          onPress={() =>
            navigation.reset({
              index: 0,
              routes: [{ name: 'Home' }],
            })
          }
        >
          <Text style={[styles.homeBtnText, { color: colors.text2 }]}>
            Back to home
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: 'space-between' },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing['3xl'],
    gap: spacing.xl,
  },

  circle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  crossIcon: { fontSize: 48, color: '#ef4444' },

  textBlock: { alignItems: 'center', gap: spacing.sm },
  title: { fontSize: 28, fontWeight: fontWeight.bold, textAlign: 'center' },
  subtitle: { fontSize: fontSize.body, textAlign: 'center', lineHeight: 22 },

  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    width: '100%',
  },
  infoIcon: { fontSize: 16 },
  infoText: { flex: 1, fontSize: fontSize.subhead, lineHeight: 20 },

  actions: { paddingHorizontal: spacing.lg, gap: spacing.md },
  retryBtn: {
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    alignItems: 'center',
  },
  retryBtnText: { fontSize: fontSize.body, fontWeight: fontWeight.bold },
  homeBtn: {
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    alignItems: 'center',
    borderWidth: 1,
  },
  homeBtnText: { fontSize: fontSize.body, fontWeight: fontWeight.semibold },
});
