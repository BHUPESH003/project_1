import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useColors } from '@/theme';
import { spacing, radius } from '@/theme/spacing';
import { fontSize, fontWeight } from '@/theme/typography';
import { SellerCard, SellerCardSkeleton } from '@/components/cards/SellerCard';
import { useSellers, type SellersSort } from '@/api/hooks/useSellers';
import { useAddressStore } from '@/stores/addressStore';
import type { Seller } from '@/api/types';

interface SellerListProps {
  categoryId?: string;
  onSellerPress: (seller: Seller) => void;
  contentPaddingBottom?: number;
}

const SORTS: { label: string; value: SellersSort }[] = [
  { label: 'Nearest', value: 'distance' },
  { label: 'Top rated', value: 'rating' },
  { label: 'Newest', value: 'newest' },
];

export function SellerList({ categoryId, onSellerPress, contentPaddingBottom = 0 }: SellerListProps) {
  const colors = useColors();
  const address = useAddressStore((s) => s.selectedAddress);
  const [sort, setSort] = useState<SellersSort>('distance');

  const params = useMemo(
    () => ({
      lat: address?.lat,
      lng: address?.lng,
      sort,
      categoryId,
    }),
    [address?.lat, address?.lng, sort, categoryId],
  );

  const { data, isLoading, isFetchingNextPage, fetchNextPage, hasNextPage, refetch, isRefetching } =
    useSellers(params);

  const sellers = useMemo(
    () => data?.pages.flatMap((p) => p.data) ?? [],
    [data],
  );

  function handleEndReached() {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }

  return (
    <View style={styles.wrap}>
      {/* Section header + sort pills */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Shops near you
        </Text>
        <View style={styles.sortRow}>
          {SORTS.map((s) => (
            <Pressable
              key={s.value}
              style={[
                styles.sortPill,
                {
                  backgroundColor:
                    sort === s.value ? colors.primarySoft : colors.surface2,
                  borderColor:
                    sort === s.value ? colors.primarySoftBorder : colors.border,
                },
              ]}
              onPress={() => setSort(s.value)}
            >
              <Text
                style={[
                  styles.sortText,
                  {
                    color:
                      sort === s.value ? colors.primary : colors.text2,
                  },
                ]}
              >
                {s.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Loading skeletons */}
      {isLoading && (
        <View style={styles.skeletons}>
          {[0, 1, 2].map((i) => (
            <SellerCardSkeleton key={i} />
          ))}
        </View>
      )}

      {/* Empty state */}
      {!isLoading && sellers.length === 0 && (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🏪</Text>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            No shops nearby
          </Text>
          <Text style={[styles.emptySub, { color: colors.text2 }]}>
            Try a different location or check back later
          </Text>
        </View>
      )}

      {/* Seller list */}
      {sellers.length > 0 && (
        <FlatList
          data={sellers}
          keyExtractor={(s) => s.id}
          renderItem={({ item }) => (
            <SellerCard
              seller={item}
              onPress={onSellerPress}
              style={styles.cardSpacing}
            />
          )}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.4}
          scrollEnabled={false}
          onRefresh={refetch}
          refreshing={isRefetching}
          contentContainerStyle={{ paddingBottom: contentPaddingBottom }}
          removeClippedSubviews
          windowSize={5}
          maxToRenderPerBatch={8}
          initialNumToRender={5}
          ListFooterComponent={
            isFetchingNextPage ? (
              <ActivityIndicator
                size="small"
                color={colors.primary}
                style={{ marginVertical: spacing.lg }}
              />
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  sectionHeader: { paddingHorizontal: spacing.xl, gap: spacing.sm },
  sectionTitle: { fontSize: fontSize.titleLg, fontWeight: fontWeight.bold },
  sortRow: { flexDirection: 'row', gap: spacing.sm },
  sortPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  sortText: { fontSize: fontSize.caption, fontWeight: fontWeight.medium },
  skeletons: { paddingHorizontal: spacing.xl, gap: spacing.md },
  cardSpacing: { marginHorizontal: spacing.xl },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing['4xl'],
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: fontSize.titleLg, fontWeight: fontWeight.bold },
  emptySub: { fontSize: fontSize.body, textAlign: 'center' },
});
