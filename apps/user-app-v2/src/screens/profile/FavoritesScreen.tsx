import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useColors } from '@/theme';
import { spacing, radius } from '@/theme/spacing';
import { AppText } from '@/components/ui/AppText';
import { IconButton } from '@/components/ui/IconButton';
import { Skeleton } from '@/components/ui/Skeleton';
import { SellerCard } from '@/components/cards/SellerCard';
import { useFavorites } from '@/api/hooks/useProfile';

export function FavoritesScreen() {
  const colors  = useColors();
  const insets  = useSafeAreaInsets();
  const nav     = useNavigation();

  const { data: favorites, isLoading } = useFavorites();

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm, borderBottomColor: colors.border }]}>
        <IconButton
          icon={<Text style={{ color: colors.text, fontSize: 18 }}>←</Text>}
          onPress={() => nav.goBack()}
          size={40}
        />
        <AppText variant="title" style={{ color: colors.text }}>Favorites</AppText>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={isLoading ? [] : (favorites ?? [])}
        keyExtractor={(s) => s.id}
        renderItem={({ item }) => (
          <SellerCard
            seller={item}
            onPress={(seller) => {
              // Cross-stack navigation to SellerDetail in HomeStack
              (nav as any).navigate('SellerDetail', { sellerId: seller.id });
            }}
          />
        )}
        ListEmptyComponent={
          isLoading ? (
            <View style={{ padding: spacing.xl, gap: spacing.md }}>
              {[1, 2, 3].map((k) => (
                <Skeleton key={k} width="100%" height={120} borderRadius={radius.lg} />
              ))}
            </View>
          ) : (
            <View style={styles.emptyWrap}>
              <AppText style={{ fontSize: 40 }}>🤍</AppText>
              <AppText variant="body" style={{ color: colors.text3, textAlign: 'center', marginTop: spacing.md }}>
                No favorites yet.{'\n'}Heart a shop to save it here.
              </AppText>
            </View>
          )
        }
        contentContainerStyle={{ padding: spacing.xl, paddingBottom: insets.bottom + 120 }}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        showsVerticalScrollIndicator={false}
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
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: spacing['3xl'],
  },
});
