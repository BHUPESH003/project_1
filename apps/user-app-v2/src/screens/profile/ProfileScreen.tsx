import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useColors } from '@/theme';
import { spacing, radius } from '@/theme/spacing';
import { fontWeight } from '@/theme/typography';
import { AppText } from '@/components/ui/AppText';
import { useAuthStore } from '@/stores/authStore';
import { showToast } from '@/stores/toastStore';
import type { ProfileStackParamList } from '@/navigation/ProfileStack';

type Nav = NativeStackNavigationProp<ProfileStackParamList, 'Profile'>;

interface MenuRowProps {
  icon: string;
  label: string;
  onPress: () => void;
  danger?: boolean;
  isLast?: boolean;
}

function MenuRow({ icon, label, onPress, danger, isLast }: MenuRowProps) {
  const colors = useColors();
  return (
    <TouchableOpacity
      style={[
        styles.menuRow,
        { borderBottomColor: colors.border },
        isLast && { borderBottomWidth: 0 },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <AppText style={{ fontSize: 20, width: 30 }}>{icon}</AppText>
      <AppText
        variant="body"
        style={{ flex: 1, color: danger ? colors.danger : colors.text }}
      >
        {label}
      </AppText>
      {!danger && <AppText style={{ color: colors.text3 }}>›</AppText>}
    </TouchableOpacity>
  );
}

function MenuSection({ children }: { children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View style={[styles.menuSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {children}
    </View>
  );
}

export function ProfileScreen() {
  const colors  = useColors();
  const insets  = useSafeAreaInsets();
  const nav     = useNavigation<Nav>();
  const user    = useAuthStore((s) => s.user);
  const logout  = useAuthStore((s) => s.logout);

  function handleLogout() {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            await logout();
            showToast({ type: 'info', message: 'Logged out successfully' });
          },
        },
      ],
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + 120 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* User card */}
        <View style={[styles.userCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <AppText style={styles.avatarText}>
              {user?.name?.[0]?.toUpperCase() ?? user?.phone?.[0] ?? 'U'}
            </AppText>
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="title" style={{ color: colors.text }}>
              {user?.name ?? 'User'}
            </AppText>
            <AppText variant="caption" style={{ color: colors.text3, marginTop: 2 }}>
              {user?.phone}
            </AppText>
          </View>
          <TouchableOpacity
            style={[styles.editBadge, { backgroundColor: colors.primarySoft, borderColor: colors.primarySoftBorder }]}
            onPress={() => nav.navigate('EditProfile')}
          >
            <AppText variant="caption" style={{ color: colors.primary, fontWeight: fontWeight.semibold }}>
              Edit
            </AppText>
          </TouchableOpacity>
        </View>

        {/* Account section */}
        <MenuSection>
          <MenuRow icon="🏠" label="My Addresses" onPress={() => nav.navigate('Addresses')} />
          <MenuRow icon="❤️" label="Favorites" onPress={() => nav.navigate('Favorites')} />
          <MenuRow icon="📦" label="My Orders" onPress={() => nav.navigate('Orders' as never)} isLast />
        </MenuSection>

        {/* Preferences section */}
        <MenuSection>
          <MenuRow icon="🔔" label="Notifications" onPress={() => nav.navigate('NotificationPrefs')} />
          <MenuRow icon="🎨" label="Appearance" onPress={() => nav.navigate('Appearance')} isLast />
        </MenuSection>

        {/* Info section */}
        <MenuSection>
          <MenuRow icon="ℹ️" label="About" onPress={() => nav.navigate('About')} isLast />
        </MenuSection>

        {/* Logout */}
        <MenuSection>
          <MenuRow icon="🚪" label="Log Out" onPress={handleLogout} danger isLast />
        </MenuSection>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: {
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 22,
    color: '#fff',
    fontWeight: '700',
  },
  editBadge: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
  },
  menuSection: {
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    gap: spacing.md,
  },
});
