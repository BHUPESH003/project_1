/**
 * Order expired – timeout explanation, CTA back to home.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { PrimaryButton } from '@/components/PrimaryButton';
import { colors } from '@/constants/colors';

export default function OrderExpiredScreen() {
  const router = useRouter();

  return (
    <ScreenWrapper>
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <MaterialIcons name="schedule" size={48} color={colors.warning} />
        </View>
        <Text style={styles.title}>Order Expired</Text>
        <Text style={styles.message}>
          This order has timed out. Payment or confirmation was not completed in time. You can start a new order from home.
        </Text>
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
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: { fontSize: 22, fontWeight: '700', color: colors.textPrimary, marginBottom: 12, textAlign: 'center' },
  message: { fontSize: 16, color: colors.textSecondary, textAlign: 'center', lineHeight: 24 },
  footer: { paddingVertical: 24 },
});
