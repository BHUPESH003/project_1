import React, { useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useColors } from '@/theme';
import { spacing } from '@/theme/spacing';
import { fontSize, fontWeight } from '@/theme/typography';
import { SellerCard, SellerCardSkeleton } from '@/components/cards/SellerCard';
import { useSellers } from '@/api/hooks/useSellers';
import { useAddressStore } from '@/stores/addressStore';
import type { Seller } from '@/api/types';

interface SellerListProps {
  categoryId?: string;
  onSellerPress: (seller: Seller) => void;
  contentPaddingBottom?: number;
}

export function SellerList({ categoryId, onSellerPress, contentPaddingBottom = 0 }: SellerListProps) {
  const colors = useColors();
  const address = useAddressStore((s) => s.selectedAddress);

  const params = useMemo(
    () => ({
      lat: address?.lat,
      lng: address?.lng,
      category: categoryId,
    }),
    [address?.lat, address?.lng, categoryId],
  );

  const { data, isLoading, isFetchingNextPage, fetchNextPage, hasNextPage } =
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
      {/* Section header */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Shops near you
        </Text>
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
          contentContainerStyle={{ paddingBottom: contentPaddingBottom }}
          removeClippedSubviews={false}
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
  sectionHeader: { paddingHorizontal: spacing.xl },
  sectionTitle: { fontSize: fontSize.titleLg, fontWeight: fontWeight.bold },
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
