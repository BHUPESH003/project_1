import React, { useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { type NativeStackScreenProps } from '@react-navigation/native-stack';
import { useColors } from '@/theme';
import { spacing } from '@/theme/spacing';
import { HomeHeader } from '@/components/home/HomeHeader';
import { SearchBar } from '@/components/home/SearchBar';
import { BannerCarousel } from '@/components/home/BannerCarousel';
import { CategoryScroller } from '@/components/home/CategoryScroller';
import { SellerList } from '@/components/home/SellerList';
import { FloatingCartBar } from '@/components/layout/FloatingCartBar';
import {
  AddressBottomSheet,
  type AddressBottomSheetRef,
} from '@/components/sheets/AddressBottomSheet';
import type { HomeStackParamList } from '@/navigation/HomeStack';
import type { Seller } from '@/api/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'Home'>;

const TAB_BAR_HEIGHT = 80;

export function HomeScreen({ navigation }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const sheetRef = useRef<AddressBottomSheetRef>(null);
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);

  function handleSellerPress(seller: Seller) {
    navigation.navigate('SellerDetail', {
      sellerId: seller.id,
      sellerName: seller.name,
    });
  }

  function handleCartPress() {
    navigation.navigate('Cart');
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top, paddingBottom: TAB_BAR_HEIGHT + 80 },
        ]}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[0]}
      >
        {/* Sticky header */}
        <View style={{ backgroundColor: colors.bg }}>
          <HomeHeader onAddressTap={() => sheetRef.current?.open()} />
        </View>

        {/* Search bar */}
        <SearchBar onPress={() => navigation.navigate('Search')} />

        {/* Banner carousel */}
        <BannerCarousel />

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

      {/* Floating cart bar */}
      <FloatingCartBar
        onPress={handleCartPress}
        bottomOffset={TAB_BAR_HEIGHT}
      />

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
