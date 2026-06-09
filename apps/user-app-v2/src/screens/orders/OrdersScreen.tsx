import React, { useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useColors } from '@/theme';
import { spacing, radius } from '@/theme/spacing';
import { fontSize, fontWeight } from '@/theme/typography';
import { AppText } from '@/components/ui/AppText';
import { Skeleton } from '@/components/ui/Skeleton';
import { OrderCard } from '@/components/cards/OrderCard';
import { useActiveOrders, usePastOrders } from '@/api/hooks/useOrders';
import type { OrdersStackParamList } from '@/navigation/OrdersStack';
import type { Order } from '@/api/types';

type Nav = NativeStackNavigationProp<OrdersStackParamList, 'Orders'>;

function EmptyOrders() {
  const colors = useColors();
  return (
    <View style={styles.emptyWrap}>
      <AppText style={{ fontSize: 48 }}>📦</AppText>
      <AppText variant="titleLg" style={{ color: colors.text, marginTop: spacing.lg }}>
        No orders yet
      </AppText>
      <AppText variant="body" style={{ color: colors.text3, textAlign: 'center', marginTop: spacing.sm }}>
        Your orders will appear here once you place one.
      </AppText>
    </View>
  );
}

function OrdersSkeleton() {
  const colors = useColors();
  return (
    <View style={{ gap: spacing.md }}>
      {[1, 2, 3].map((k) => (
        <View
          key={k}
          style={[styles.skeletonCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Skeleton width="55%" height={16} borderRadius={6} />
          <View style={{ marginTop: spacing.sm }}>
            <Skeleton width="35%" height={12} borderRadius={6} />
          </View>
          <View style={[styles.skeletonDivider, { backgroundColor: colors.border }]} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Skeleton width={80} height={12} borderRadius={6} />
            <Skeleton width={60} height={14} borderRadius={6} />
          </View>
        </View>
      ))}
    </View>
  );
}

export function OrdersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const nav    = useNavigation<Nav>();

  const { data: activeOrders, isLoading: loadingActive, refetch: refetchActive } = useActiveOrders();
  const {
    data: pastPages,
    isLoading: loadingPast,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch: refetchPast,
  } = usePastOrders();

  const pastOrders: Order[] = pastPages?.pages.flatMap((p) => p.data) ?? [];

  const onRefresh = useCallback(() => {
    refetchActive();
    refetchPast();
  }, [refetchActive, refetchPast]);

  const isLoading = loadingActive || loadingPast;
  const isEmpty   = !isLoading && !activeOrders?.length && !pastOrders.length;

  function goToDetail(orderId: string) {
    nav.navigate('OrderDetail', { orderId });
  }

  const headerComponent = (
    <View>
      <View style={[styles.header, { paddingTop: insets.top + spacing.lg }]}>
        <AppText variant="titleLg" style={{ color: colors.text }}>
          My Orders
        </AppText>
      </View>

      {/* Active orders section */}
      {(loadingActive || (activeOrders && activeOrders.length > 0)) && (
        <View style={styles.section}>
          <AppText variant="body" style={[styles.sectionLabel, { color: colors.text2 }]}>
            ACTIVE
          </AppText>
          {loadingActive ? (
            <OrdersSkeleton />
          ) : (
            activeOrders?.map((o) => (
              <OrderCard key={o.id} order={o} onPress={() => goToDetail(o.id)} />
            ))
          )}
        </View>
      )}

      {/* Past orders section header */}
      {(loadingPast || pastOrders.length > 0) && (
        <AppText variant="body" style={[styles.sectionLabel, { color: colors.text2, marginHorizontal: spacing.xl }]}>
          PAST ORDERS
        </AppText>
      )}
    </View>
  );

  if (isEmpty) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <View style={[styles.header, { paddingTop: insets.top + spacing.lg }]}>
          <AppText variant="titleLg" style={{ color: colors.text }}>
            My Orders
          </AppText>
        </View>
        <EmptyOrders />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <FlatList
        data={pastOrders}
        keyExtractor={(o) => o.id}
        renderItem={({ item }) => (
          <View style={{ paddingHorizontal: spacing.xl }}>
            <OrderCard order={item} onPress={() => goToDetail(item.id)} compact />
          </View>
        )}
        ListHeaderComponent={headerComponent}
        ListEmptyComponent={
          loadingPast ? (
            <View style={{ paddingHorizontal: spacing.xl }}>
              <OrdersSkeleton />
            </View>
          ) : null
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <ActivityIndicator
              style={{ marginVertical: spacing.xl }}
              color={colors.primary}
            />
          ) : null
        }
        onEndReached={() => hasNextPage && fetchNextPage()}
        onEndReachedThreshold={0.4}
        removeClippedSubviews
        windowSize={5}
        maxToRenderPerBatch={8}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  section: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.bold,
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing['3xl'],
  },
  skeletonCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  skeletonDivider: {
    height: 1,
    marginVertical: spacing.md,
  },
});
