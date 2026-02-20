/**
 * Session expired screen – shown after 401 when refresh fails.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useThemeColors, useThemedStyles } from '@/theme';
import { useAuthStore } from '@/store/auth.store';

export default function SessionExpiredScreen() {
  const colors = useThemeColors();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const resetSessionExpired = useAuthStore((s) => s.resetSessionExpired);

  const handleSignIn = () => {
    resetSessionExpired();
    router.replace('/(auth)/login');
  };

  return (
    <ScreenWrapper>
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <MaterialIcons name="logout" size={48} color={colors.warning} />
        </View>
        <Text style={styles.title}>Session Expired</Text>
        <Text style={styles.message}>Please sign in again to continue.</Text>
      </View>
      <View style={styles.footer}>
        <PrimaryButton label="Sign In" onPress={handleSignIn} />
      </View>
    </ScreenWrapper>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.warningBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: { fontSize: 22, fontWeight: '700', color: colors.textPrimary, marginBottom: 12, textAlign: 'center' },
  message: { fontSize: 16, color: colors.textSecondary, textAlign: 'center' },
  footer: { paddingVertical: 24 },
});
