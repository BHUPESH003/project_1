/**
 * Add saved address – POST /users/me/addresses (Phase 4G).
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useThemeColors, useThemedStyles } from '@/theme';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { useAddressStore } from '@/store/address.store';
import { showToast } from '@/lib/toast';

export default function AddAddressScreen() {
  const colors = useThemeColors();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const params = useLocalSearchParams();
  const returnTo = (params?.returnTo as string) || null;
  const selectedAddress = useAddressStore((s) => s.selectedAddress);
  const fetchCurrentLocation = useAddressStore((s) => s.fetchCurrentLocation);
  const saveAddress = useAddressStore((s) => s.saveAddress);
  const addressLoading = useAddressStore((s) => s.loading);

  const [label, setLabel] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const onUseCurrentLocation = async () => {
    const addr = await fetchCurrentLocation();
    if (addr?.fullAddress) setAddressLine(addr.fullAddress);
  };

  const onSave = async () => {
    setError(null);
    const trimmedLabel = label.trim();
    const trimmedLine = addressLine.trim();
    if (!trimmedLabel || !trimmedLine) {
      setError('Label and address are required');
      return;
    }

    const lat = selectedAddress?.lat ?? 0;
    const lng = selectedAddress?.lng ?? 0;

    setIsSaving(true);
    const saved = await saveAddress({
      label: trimmedLabel,
      fullAddress: trimmedLine,
      lat,
      lng,
    });
    setIsSaving(false);

    if (saved) {
      showToast({ type: 'success', message: 'Address saved!' });
      if (returnTo === '/order/delivery' && saved.id) {
        router.replace(`/order/delivery?selectedAddressId=${saved.id}`);
      } else {
        router.back();
      }
    } else {
      setError('Failed to add address');
    }
  };

  return (
    <ScreenWrapper>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Add Address</Text>
        <View style={styles.placeholder} />
      </View>
      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={80}
      >
        <View style={styles.field}>
          <Text style={styles.label}>Label (e.g. Home, Office)</Text>
          <TextInput
            style={styles.input}
            value={label}
            onChangeText={setLabel}
            placeholder="Home"
            placeholderTextColor={colors.textMuted}
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Address</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            value={addressLine}
            onChangeText={setAddressLine}
            placeholder="Street, city, PIN"
            placeholderTextColor={colors.textMuted}
            multiline
          />
          <TouchableOpacity
            style={styles.useLocationBtn}
            onPress={onUseCurrentLocation}
            disabled={addressLoading}
          >
            <MaterialIcons name="my-location" size={20} color={colors.primary} />
            <Text style={styles.useLocationText}>Use current location</Text>
          </TouchableOpacity>
        </View>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <View style={styles.footer}>
          <PrimaryButton
            label={isSaving ? 'Saving…' : 'Save'}
            onPress={onSave}
            disabled={!label.trim() || !addressLine.trim() || isSaving}
          />
        </View>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
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
  content: { flex: 1, padding: spacing.lg },
  field: { marginBottom: spacing.lg },
  label: { ...typography.secondary, color: colors.textMuted, marginBottom: spacing.sm },
  input: {
    ...typography.primary,
    color: colors.textPrimary,
    backgroundColor: colors.surfaceDark,
    borderWidth: 1,
    borderColor: colors.borderDark,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputMultiline: { minHeight: 80, textAlignVertical: 'top' },
  useLocationBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  useLocationText: { fontSize: 14, fontWeight: '500', color: colors.primary },
  errorText: { ...typography.secondary, color: colors.error, marginBottom: spacing.md },
  footer: { marginTop: spacing.xl },
});
