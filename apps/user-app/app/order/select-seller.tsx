/**
 * Select seller for order – list from API, select then go to delivery.
 */
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { MaterialIcons } from '@expo/vector-icons';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Loader } from '@/components/Loader';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { useOrderDraftStore } from '@/store/order-draft.store';
import { useLocationStore } from '@/store/location.store';
import { sellersApi, type SellerListItem } from '@/api/sellers.api';
import { ordersApi } from '@/api/orders.api';

const CATEGORY_PRINTING = 'printing';

function mapSellerToRow(s: SellerListItem) {
  return {
    id: s.seller_id,
    name: s.shop_name,
    address: s.address,
    perPage: s.price_breakdown?.per_page ?? 0,
    prepMin: s.prep_time_min ?? 0,
  };
}

export default function SelectSellerScreen() {
  const router = useRouter();
  const orderId = useOrderDraftStore((s) => s.orderId);
  const coords = useLocationStore((s) => s.coords);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: list = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ['sellers', CATEGORY_PRINTING, coords?.latitude, coords?.longitude],
    queryFn: () =>
      sellersApi.getAvailableSellers({
        category: CATEGORY_PRINTING,
        lat: coords?.latitude,
        lng: coords?.longitude,
      }),
    enabled: !!orderId,
  });

  const selectSellerMutation = useMutation({
    mutationFn: (sellerId: string) => ordersApi.selectSeller(orderId!, sellerId),
    onSuccess: () => router.push('/order/delivery'),
    onError: () => {},
  });

  const rows = useMemo(() => list.map(mapSellerToRow), [list]);
  const selected = rows.find((r) => r.id === selectedId);
  const canProceed = !!selectedId && !selectSellerMutation.isPending;

  if (!orderId) {
    router.replace('/order/upload');
    return null;
  }

  if (isLoading) {
    return (
      <ScreenWrapper>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Choose Shop</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loaderWrap}>
          <Loader />
        </View>
      </ScreenWrapper>
    );
  }

  if (isError) {
    return (
      <ScreenWrapper>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Choose Shop</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.errorWrap}>
          <Text style={styles.errorText}>{(error as Error)?.message ?? 'Failed to load shops'}</Text>
          <TouchableOpacity onPress={() => refetch()} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </ScreenWrapper>
    );
  }

  if (rows.length === 0) {
    return (
      <ScreenWrapper>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Choose Shop</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>No shops available in your area. Try enabling location.</Text>
        </View>
      </ScreenWrapper>
    );
  }

  const onProceed = () => {
    if (selectedId) selectSellerMutation.mutate(selectedId);
  };

  return (
    <ScreenWrapper>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Choose Shop</Text>
        <View style={styles.placeholder} />
      </View>
      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const isSelected = selectedId === item.id;
          return (
            <TouchableOpacity
              style={[styles.card, isSelected && styles.cardSelected]}
              onPress={() => setSelectedId(item.id)}
              activeOpacity={0.85}
            >
              <View style={styles.cardLeft}>
                <MaterialIcons name="store" size={22} color={colors.primary} />
                <View style={styles.cardText}>
                  <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.cardMeta}>₹{item.perPage}/page · {item.prepMin} min</Text>
                </View>
              </View>
              <View style={[styles.radio, isSelected && styles.radioActive]}>
                {isSelected && <View style={styles.radioInner} />}
              </View>
            </TouchableOpacity>
          );
        }}
      />
      <View style={styles.footer}>
        {selectSellerMutation.isError && (
          <Text style={styles.footerError}>{(selectSellerMutation.error as Error)?.message}</Text>
        )}
        <PrimaryButton
          label={selectSellerMutation.isPending ? 'Selecting…' : 'Continue'}
          onPress={onProceed}
          disabled={!canProceed}
        />
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 4,
  },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: 18, fontWeight: '700', color: colors.textPrimary, textAlign: 'center' },
  placeholder: { width: 40 },
  loaderWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  errorText: { ...typography.secondary, color: colors.error, marginBottom: spacing.md, textAlign: 'center' },
  retryBtn: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  retryText: { ...typography.secondary, fontWeight: '600', color: colors.primary },
  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  emptyText: { ...typography.secondary, color: colors.textMuted, textAlign: 'center' },
  listContent: { padding: spacing.md, paddingBottom: 120 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: colors.surfaceDark,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderDark,
    marginBottom: 12,
  },
  cardSelected: { borderColor: colors.primary },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 },
  cardText: { flex: 1, minWidth: 0 },
  cardName: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  cardMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.borderDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: { borderColor: colors.primary },
  radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primary },
  footer: { paddingVertical: 24 },
  footerError: { fontSize: 12, color: colors.error, marginBottom: 8 },
});
