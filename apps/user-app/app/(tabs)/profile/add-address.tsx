/**
 * Add saved address – POST /users/me/addresses (Phase 4G).
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MaterialIcons } from '@expo/vector-icons';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useThemeColors, useThemedStyles } from '@/theme';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { usersApi } from '@/api/users.api';
import { useLocationStore } from '@/store/location.store';

export default function AddAddressScreen() {
  const colors = useThemeColors();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams();
  const returnTo = (params?.returnTo as string) || null;
  const coords = useLocationStore((s) => s.coords);
  const fetchLocation = useLocationStore((s) => s.fetchLocation);
  const locationLoading = useLocationStore((s) => s.loading);

  const [label, setLabel] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [error, setError] = useState<string | null>(null);

  const addMutation = useMutation({
    mutationFn: (body: { label: string; addressLine: string; latitude?: number; longitude?: number }) =>
      usersApi.addAddress(body),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      // If coming from order flow, return to delivery with the new address ID
      if (returnTo === '/order/delivery' && data?.id) {
        router.replace(`/order/delivery?selectedAddressId=${data.id}`);
      } else {
        router.back();
      }
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'Failed to add address'),
  });

  const onUseCurrentLocation = async () => {
    const c = await fetchLocation();
    if (c?.label) setAddressLine(c.label);
    else if (c) setAddressLine(`${c.latitude.toFixed(4)}, ${c.longitude.toFixed(4)}`);
  };

  const onSave = () => {
    setError(null);
    const trimmedLabel = label.trim();
    const trimmedLine = addressLine.trim();
    if (!trimmedLabel || !trimmedLine) {
      setError('Label and address are required');
      return;
    }
    addMutation.mutate({
      label: trimmedLabel,
      addressLine: trimmedLine,
      ...(coords && { latitude: coords.latitude, longitude: coords.longitude }),
    });
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
            disabled={locationLoading}
          >
            <MaterialIcons name="my-location" size={20} color={colors.primary} />
            <Text style={styles.useLocationText}>Use current location</Text>
          </TouchableOpacity>
        </View>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <View style={styles.footer}>
          <PrimaryButton
            label={addMutation.isPending ? 'Saving…' : 'Save'}
            onPress={onSave}
            disabled={!label.trim() || !addressLine.trim() || addMutation.isPending}
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
