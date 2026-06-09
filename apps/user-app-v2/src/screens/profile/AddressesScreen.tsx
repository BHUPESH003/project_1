import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useColors } from '@/theme';
import { spacing, radius } from '@/theme/spacing';
import { fontWeight } from '@/theme/typography';
import { AppText } from '@/components/ui/AppText';
import { IconButton } from '@/components/ui/IconButton';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { AddressBottomSheet } from '@/components/sheets/AddressBottomSheet';
import { useAddresses } from '@/api/hooks/useAddresses';
import { useDeleteAddress } from '@/api/hooks/useProfile';
import { showToast } from '@/stores/toastStore';
import type { Address } from '@/api/types';
import type { AddressBottomSheetRef } from '@/components/sheets/AddressBottomSheet';

const LABEL_ICON: Record<string, string> = {
  HOME: '🏠',
  WORK: '💼',
  OTHER: '📍',
};

export function AddressesScreen() {
  const colors   = useColors();
  const insets   = useSafeAreaInsets();
  const nav      = useNavigation();
  const sheetRef = useRef<AddressBottomSheetRef>(null);

  const { data: addresses, isLoading, refetch } = useAddresses();
  const { mutateAsync: deleteAddress, isPending: deleting } = useDeleteAddress();

  function confirmDelete(addr: Address) {
    Alert.alert(
      'Remove Address',
      `Remove "${addr.line1}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAddress(addr.id);
              showToast({ type: 'success', message: 'Address removed' });
              refetch();
            } catch {
              showToast({ type: 'error', message: 'Failed to remove address' });
            }
          },
        },
      ],
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm, borderBottomColor: colors.border }]}>
        <IconButton
          icon={<Text style={{ color: colors.text, fontSize: 18 }}>←</Text>}
          onPress={() => nav.goBack()}
          size={40}
        />
        <AppText variant="title" style={{ color: colors.text }}>My Addresses</AppText>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={isLoading ? [] : (addresses ?? [])}
        keyExtractor={(a) => a.id}
        renderItem={({ item }) => (
          <View style={[styles.addressCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.addrLeft}>
              <AppText style={{ fontSize: 20 }}>{LABEL_ICON[item.label] ?? '📍'}</AppText>
              <View style={{ flex: 1 }}>
                <AppText variant="body" style={{ color: colors.text, fontWeight: fontWeight.semibold }}>{item.label}</AppText>
                <AppText variant="caption" style={{ color: colors.text2, marginTop: 2 }}>
                  {item.line1}{item.line2 ? `, ${item.line2}` : ''}, {item.city}
                </AppText>
                {item.receiverName && (
                  <AppText variant="caption" style={{ color: colors.text3, marginTop: 1 }}>
                    {item.receiverName} {item.receiverPhone ? `· ${item.receiverPhone}` : ''}
                  </AppText>
                )}
              </View>
            </View>
            <TouchableOpacity
              style={[styles.deleteBtn, { borderColor: colors.danger }]}
              onPress={() => confirmDelete(item)}
              disabled={deleting}
            >
              <AppText variant="caption" style={{ color: colors.danger }}>Remove</AppText>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          isLoading ? (
            <View style={{ padding: spacing.xl, gap: spacing.md }}>
              {[1, 2].map((k) => (
                <Skeleton key={k} width="100%" height={80} borderRadius={radius.lg} />
              ))}
            </View>
          ) : (
            <View style={styles.emptyWrap}>
              <AppText style={{ fontSize: 40 }}>📍</AppText>
              <AppText variant="body" style={{ color: colors.text3, textAlign: 'center', marginTop: spacing.md }}>
                No saved addresses yet.
              </AppText>
            </View>
          )
        }
        contentContainerStyle={{ padding: spacing.xl, paddingBottom: insets.bottom + 120 }}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        ListFooterComponent={
          <View style={{ marginTop: spacing.xl }}>
            <Button label="+ Add New Address" variant="secondary" onPress={() => sheetRef.current?.open()} />
          </View>
        }
        showsVerticalScrollIndicator={false}
      />

      <AddressBottomSheet
        ref={sheetRef}
        onAddressSelected={() => {
          refetch();
          sheetRef.current?.close();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
  },
  addressCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  addrLeft: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.md,
  },
  deleteBtn: {
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: spacing['3xl'],
  },
});
