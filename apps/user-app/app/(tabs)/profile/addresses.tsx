/**
 * Saved addresses – GET /users/me/addresses, add, delete (Phase 4G).
 */
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Loader } from '@/components/Loader';
import { useThemeColors, useThemedStyles } from '@/theme';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { useAddressStore } from '@/store/address.store';
import type { Address } from '@/types/address';

export default function SavedAddressesScreen() {
  const colors = useThemeColors();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();

  const savedAddresses = useAddressStore((s) => s.savedAddresses);
  const loadSavedAddresses = useAddressStore((s) => s.loadSavedAddresses);
  const deleteAddress = useAddressStore((s) => s.deleteAddress);
  const [isLoading, setIsLoading] = React.useState(true);

  useEffect(() => {
    loadSavedAddresses().finally(() => setIsLoading(false));
  }, [loadSavedAddresses]);

  const onAddAddress = () => router.push('/(tabs)/profile/add-address');

  const onDelete = (item: Address) => {
    Alert.alert('Delete address', `Remove "${item.label}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteAddress(item.id),
      },
    ]);
  };

  return (
    <ScreenWrapper>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Saved Addresses</Text>
        <View style={styles.placeholder} />
      </View>

      {isLoading ? (
        <View style={styles.loaderWrap}><Loader /></View>
      ) : (
        <FlatList
          data={savedAddresses}
          keyExtractor={(item, index) => item.id ?? `address-${index}`}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>No saved addresses. Add one below.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <MaterialIcons name="location-on" size={22} color={colors.primary} />
              <View style={styles.cardText}>
                <Text style={styles.cardLabel}>{item.label}</Text>
                <Text style={styles.cardLine}>{item.fullAddress}</Text>
              </View>
              <TouchableOpacity
                onPress={() => onDelete(item)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <MaterialIcons name="delete-outline" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          )}
        />
      )}
      <View style={styles.footer}>
        <PrimaryButton label="Add New Address" onPress={onAddAddress} />
      </View>
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
  loaderWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  errorText: { ...typography.secondary, color: colors.error, marginBottom: spacing.md, textAlign: 'center' },
  retryBtn: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  retryText: { ...typography.secondary, fontWeight: '600', color: colors.primary },
  emptyWrap: { paddingVertical: spacing.xl, alignItems: 'center' },
  emptyText: { ...typography.secondary, color: colors.textMuted },
  list: { paddingVertical: 16, paddingBottom: 100 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: colors.surfaceDark,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.borderDark,
  },
  cardText: { flex: 1, minWidth: 0 },
  cardLabel: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  cardLine: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, paddingBottom: 32, backgroundColor: colors.backgroundDark },
});
