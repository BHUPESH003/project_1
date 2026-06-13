import React, { useRef, useState, useCallback } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { type NativeStackScreenProps } from '@react-navigation/native-stack';
import { useColors } from '@/theme';
import { spacing } from '@/theme/spacing';
import { useQueryClient } from '@tanstack/react-query';
import { HomeHeader } from '@/components/home/HomeHeader';
import { SearchBar } from '@/components/home/SearchBar';
import { BannerCarousel } from '@/components/home/BannerCarousel';
import { CategoryScroller } from '@/components/home/CategoryScroller';
import { SellerList } from '@/components/home/SellerList';
import {
  AddressBottomSheet,
  type AddressBottomSheetRef,
} from '@/components/sheets/AddressBottomSheet';
import type { HomeStackParamList } from '@/navigation/HomeStack';
import type { Seller } from '@/api/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'Home'>;

export function HomeScreen({ navigation }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const sheetRef = useRef<AddressBottomSheetRef>(null);
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [refreshing, setRefreshing] = useState(false);
  const queryClient = useQueryClient();

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['sellers'] });
    await queryClient.invalidateQueries({ queryKey: ['banners'] });
    setRefreshing(false);
  }, [queryClient]);

  function handleSellerPress(seller: Seller) {
    navigation.navigate('SellerDetail', {
      sellerId: seller.id,
      sellerName: seller.name,
    });
  }

  function handleBannerPress(ctaLink?: string) {
    if (ctaLink) {
      setCategoryId(ctaLink);
    } else {
      navigation.navigate('Search');
    }
  }

  function handleFavoritesTap() {
    navigation.getParent()?.navigate('Profile');
  }

  function handleNotificationsTap() {
    navigation.getParent()?.navigate('Orders');
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top, paddingBottom: 160 },
        ]}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[0]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Sticky header */}
        <View style={{ backgroundColor: colors.bg }}>
          <HomeHeader
            onAddressTap={() => sheetRef.current?.open()}
            onFavoritesTap={handleFavoritesTap}
            onNotificationsTap={handleNotificationsTap}
          />
        </View>

        {/* Search bar */}
        <SearchBar onPress={() => navigation.navigate('Search')} />

        {/* Banner carousel */}
        <BannerCarousel onBannerPress={handleBannerPress} />

        {/* Category scroller */}
        <CategoryScroller
          selectedCategoryId={categoryId}
          onCategorySelect={setCategoryId}
        />

        {/* Seller list (has its own internal FlatList with scrollEnabled=false) */}
        <SellerList
          categoryId={categoryId}
          onSellerPress={handleSellerPress}
          contentPaddingBottom={spacing.lg}
        />
      </ScrollView>

      {/* Address bottom sheet */}
      <AddressBottomSheet ref={sheetRef} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  content: { gap: spacing.lg },
});
