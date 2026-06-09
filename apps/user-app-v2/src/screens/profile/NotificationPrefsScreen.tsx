import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useColors } from '@/theme';
import { spacing, radius } from '@/theme/spacing';
import { AppText } from '@/components/ui/AppText';
import { IconButton } from '@/components/ui/IconButton';
import { useNotificationPreferences, useUpdateNotificationPreferences } from '@/api/hooks/useProfile';
import { showToast } from '@/stores/toastStore';
import type { NotificationPreferences } from '@/api/types';

interface ToggleRowProps {
  label: string;
  description: string;
  value: boolean;
  onChange: (val: boolean) => void;
  disabled?: boolean;
}

function ToggleRow({ label, description, value, onChange, disabled }: ToggleRowProps) {
  const colors = useColors();
  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <View style={{ flex: 1 }}>
        <AppText variant="body" style={{ color: colors.text }}>{label}</AppText>
        <AppText variant="caption" style={{ color: colors.text3, marginTop: 2 }}>{description}</AppText>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ false: colors.surface3, true: colors.primary }}
        thumbColor="#fff"
      />
    </View>
  );
}

export function NotificationPrefsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const nav    = useNavigation();

  const { data: prefs, isLoading } = useNotificationPreferences();
  const { mutateAsync: update, isPending } = useUpdateNotificationPreferences();

  async function toggle(key: keyof NotificationPreferences, val: boolean) {
    try {
      await update({ [key]: val });
    } catch {
      showToast({ type: 'error', message: 'Failed to update preference' });
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm, borderBottomColor: colors.border }]}>
        <IconButton icon={<Text style={{ color: colors.text, fontSize: 18 }}>←</Text>} onPress={() => nav.goBack()} size={40} />
        <AppText variant="title" style={{ color: colors.text }}>Notifications</AppText>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: spacing.xl, paddingBottom: insets.bottom + spacing['3xl'] }}
        >
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <ToggleRow
              label="Order Updates"
              description="Status changes, delivery notifications"
              value={prefs?.orderUpdates ?? true}
              onChange={(v) => toggle('orderUpdates', v)}
              disabled={isPending}
            />
            <ToggleRow
              label="Promotions"
              description="Deals, discounts, and special offers"
              value={prefs?.promotions ?? true}
              onChange={(v) => toggle('promotions', v)}
              disabled={isPending}
            />
            <ToggleRow
              label="New Sellers"
              description="New shops opening near you"
              value={prefs?.newSellers ?? false}
              onChange={(v) => toggle('newSellers', v)}
              disabled={isPending}
            />
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    gap: spacing.md,
  },
});
