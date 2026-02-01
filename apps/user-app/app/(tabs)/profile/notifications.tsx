/**
 * Notification settings – GET/PATCH /users/me/notification-preferences (Phase 4G).
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MaterialIcons } from '@expo/vector-icons';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Loader } from '@/components/Loader';
import { colors } from '@/constants/colors';
import { usersApi } from '@/api/users.api';

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: prefs, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: () => usersApi.getNotificationPreferences(),
  });

  const updateMutation = useMutation({
    mutationFn: (body: { orderUpdates?: boolean; promotions?: boolean }) =>
      usersApi.updateNotificationPreferences(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notification-preferences'] }),
  });

  const setOrderUpdates = (value: boolean) => updateMutation.mutate({ orderUpdates: value });
  const setPromotions = (value: boolean) => updateMutation.mutate({ promotions: value });

  if (isLoading) {
    return (
      <ScreenWrapper>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Notification Settings</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loaderWrap}><Loader /></View>
      </ScreenWrapper>
    );
  }

  if (isError) {
    return (
      <ScreenWrapper>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Notification Settings</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.errorWrap}>
          <Text style={styles.errorText}>{(error as Error)?.message ?? 'Failed to load settings'}</Text>
          <TouchableOpacity onPress={() => refetch()} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </ScreenWrapper>
    );
  }

  const orderUpdates = prefs?.orderUpdates ?? true;
  const promotions = prefs?.promotions ?? false;

  return (
    <ScreenWrapper>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Notification Settings</Text>
        <View style={styles.placeholder} />
      </View>
      <View style={styles.content}>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.rowLabel}>Order updates</Text>
            <Text style={styles.rowHint}>Status and delivery notifications</Text>
          </View>
          <Switch
            value={orderUpdates}
            onValueChange={setOrderUpdates}
            disabled={updateMutation.isPending}
            trackColor={{ false: colors.surfaceMuted, true: colors.primaryTint }}
            thumbColor={orderUpdates ? colors.primary : colors.textMuted}
          />
        </View>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.rowLabel}>Promotions</Text>
            <Text style={styles.rowHint}>Offers and discounts</Text>
          </View>
          <Switch
            value={promotions}
            onValueChange={setPromotions}
            disabled={updateMutation.isPending}
            trackColor={{ false: colors.surfaceMuted, true: colors.primaryTint }}
            thumbColor={promotions ? colors.primary : colors.textMuted}
          />
        </View>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDark,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: 18, fontWeight: '700', color: colors.textPrimary, textAlign: 'center' },
  placeholder: { width: 40 },
  loaderWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorText: { fontSize: 14, color: colors.error, marginBottom: 12, textAlign: 'center' },
  retryBtn: { paddingVertical: 8, paddingHorizontal: 16 },
  retryText: { fontSize: 14, fontWeight: '600', color: colors.primary },
  content: { paddingTop: 24 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  rowText: { flex: 1 },
  rowLabel: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  rowHint: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
});
