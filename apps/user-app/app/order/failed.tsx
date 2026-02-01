/**
 * Order failed – seller rejected / delivery failed variants (static).
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { PrimaryButton } from '@/components/PrimaryButton';
import { colors } from '@/constants/colors';

// Static: show generic failure message
const MOCK_REASON = 'Seller could not fulfill the order.';

export default function OrderFailedScreen() {
  const router = useRouter();

  return (
    <ScreenWrapper>
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <MaterialIcons name="error" size={48} color={colors.error} />
        </View>
        <Text style={styles.title}>Order Failed</Text>
        <Text style={styles.message}>{MOCK_REASON}</Text>
        <Text style={styles.hint}>A refund will be processed if payment was made.</Text>
      </View>
      <View style={styles.footer}>
        <PrimaryButton label="Back to Home" onPress={() => router.replace('/(tabs)/home')} />
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: colors.errorBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: { fontSize: 22, fontWeight: '700', color: colors.textPrimary, marginBottom: 12, textAlign: 'center' },
  message: { fontSize: 16, color: colors.textSecondary, textAlign: 'center', lineHeight: 24, marginBottom: 8 },
  hint: { fontSize: 14, color: colors.textMuted, textAlign: 'center' },
  footer: { paddingVertical: 24 },
});
