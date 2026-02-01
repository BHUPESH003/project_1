/**
 * Maintenance / service unavailable screen – static UI.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { PrimaryButton } from '@/components/PrimaryButton';
import { colors } from '@/constants/colors';

export default function MaintenanceScreen() {
  const router = useRouter();

  return (
    <ScreenWrapper>
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <MaterialIcons name="construction" size={48} color={colors.warning} />
        </View>
        <Text style={styles.title}>Service Unavailable</Text>
        <Text style={styles.message}>We're under maintenance. Please try again later.</Text>
      </View>
      <View style={styles.footer}>
        <PrimaryButton label="Try Again" onPress={() => router.back()} />
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
  message: { fontSize: 16, color: colors.textSecondary, textAlign: 'center' },
  footer: { paddingVertical: 24 },
});
