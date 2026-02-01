/**
 * Generic error screen – static UI.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { PrimaryButton } from '@/components/PrimaryButton';
import { colors } from '@/constants/colors';

export default function ErrorScreen() {
  const router = useRouter();

  return (
    <ScreenWrapper>
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <MaterialIcons name="error-outline" size={48} color={colors.error} />
        </View>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.message}>We couldn't complete your request. Please try again.</Text>
      </View>
      <View style={styles.footer}>
        <PrimaryButton label="Go Back" onPress={() => router.back()} />
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
  message: { fontSize: 16, color: colors.textSecondary, textAlign: 'center' },
  footer: { paddingVertical: 24 },
});
