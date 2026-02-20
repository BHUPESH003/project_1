/**
 * Profile screen – data from GET /users/me. Edit name via PATCH.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Loader } from '@/components/Loader';
import { useThemeColors, useThemedStyles } from '@/theme';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { usersApi } from '@/api/users.api';
import { useAuthStore } from '@/store/auth.store';

export default function ProfileScreen() {
  const colors = useThemeColors();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const logout = useAuthStore((s) => s.logout);

  const { data: profile, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['profile'],
    queryFn: () => usersApi.getMe(),
  });

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  if (isLoading) {
    return (
      <ScreenWrapper>
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
        </View>
        <View style={styles.loaderWrap}><Loader /></View>
      </ScreenWrapper>
    );
  }

  if (isError) {
    return (
      <ScreenWrapper>
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
        </View>
        <View style={styles.errorWrap}>
          <Text style={styles.errorText}>{(error as Error)?.message ?? 'Failed to load profile'}</Text>
          <TouchableOpacity onPress={() => refetch()} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </ScreenWrapper>
    );
  }

  const displayName = profile?.name?.trim() || 'User';
  const displayPhone = profile?.phone ?? '—';

  return (
    <ScreenWrapper>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: spacing.xl + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.avatarWrap}>
          <View style={styles.avatar}>
            <MaterialIcons name="person" size={48} color={colors.textMuted} />
          </View>
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.phone}>{displayPhone}</Text>
        </View>
        <View style={styles.menu}>
          <TouchableOpacity style={styles.menuRow} onPress={() => router.push('/(tabs)/profile/edit')} activeOpacity={0.85}>
            <MaterialIcons name="edit" size={22} color={colors.primary} />
            <Text style={styles.menuLabel} numberOfLines={1}>Edit Profile</Text>
            <MaterialIcons name="chevron-right" size={24} color={colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuRow} onPress={() => router.push('/(tabs)/profile/addresses')} activeOpacity={0.85}>
            <MaterialIcons name="location-on" size={22} color={colors.primary} />
            <Text style={styles.menuLabel} numberOfLines={1}>Saved Addresses</Text>
            <MaterialIcons name="chevron-right" size={24} color={colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuRow} onPress={() => router.push('/(tabs)/profile/notifications')} activeOpacity={0.85}>
            <MaterialIcons name="notifications" size={22} color={colors.primary} />
            <Text style={styles.menuLabel} numberOfLines={1}>Notification Settings</Text>
            <MaterialIcons name="chevron-right" size={24} color={colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuRow} onPress={() => router.push('/(tabs)/profile/appearance')} activeOpacity={0.85}>
            <MaterialIcons name="palette" size={22} color={colors.primary} />
            <Text style={styles.menuLabel} numberOfLines={1}>Appearance</Text>
            <MaterialIcons name="chevron-right" size={24} color={colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.menuRow, styles.logoutRow]} onPress={handleLogout} activeOpacity={0.85}>
            <MaterialIcons name="logout" size={22} color={colors.error} />
            <Text style={styles.logoutText}>Log out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  header: { paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.borderDark },
  title: { ...typography.screenTitle, color: colors.textPrimary },
  loaderWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  errorText: { ...typography.secondary, color: colors.error, marginBottom: spacing.md, textAlign: 'center' },
  retryBtn: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  retryText: { ...typography.secondary, fontWeight: '600', color: colors.primary },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  avatarWrap: { alignItems: 'center', paddingVertical: spacing.xl },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.surfaceDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  name: { ...typography.sectionHeader, fontSize: 20, color: colors.textPrimary, marginBottom: spacing.xxs },
  phone: { ...typography.meta, color: colors.textMuted },
  menu: { marginTop: spacing.md },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    gap: spacing.sm,
    minWidth: 0,
  },
  menuLabel: { flex: 1, minWidth: 0, ...typography.primary, color: colors.textPrimary },
  logoutRow: { borderBottomWidth: 0 },
  logoutText: { flex: 1, ...typography.primary, color: colors.error },
});
