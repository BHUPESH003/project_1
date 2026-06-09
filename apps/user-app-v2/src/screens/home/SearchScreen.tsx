import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { type NativeStackScreenProps } from '@react-navigation/native-stack';
import { useColors } from '@/theme';
import { spacing, radius } from '@/theme/spacing';
import { fontSize, fontWeight } from '@/theme/typography';
import { useSearch } from '@/api/hooks/useSearch';
import { useAddressStore } from '@/stores/addressStore';
import type { HomeStackParamList } from '@/navigation/HomeStack';
import type { Seller, SearchProduct } from '@/api/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'Search'>;

function useDebounce<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

export function SearchScreen({ navigation }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const address = useAddressStore((s) => s.selectedAddress);

  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);
  const inputRef = useRef<TextInput>(null);

  const { data, isLoading } = useSearch(
    debouncedQuery,
    address?.lat,
    address?.lng,
  );

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  function handleSellerPress(seller: Seller) {
    Keyboard.dismiss();
    navigation.navigate('SellerDetail', {
      sellerId: seller.id,
      sellerName: seller.name,
    });
  }

  function handleProductPress(product: SearchProduct) {
    Keyboard.dismiss();
    navigation.navigate('SellerDetail', {
      sellerId: product.sellerId,
      sellerName: product.sellerName,
    });
  }

  const hasResults = data && (data.sellers.length > 0 || data.products.length > 0);

  const renderSellerResult = useCallback(
    ({ item }: { item: Seller }) => (
      <Pressable
        style={[styles.resultRow, { borderBottomColor: colors.borderFaint }]}
        onPress={() => handleSellerPress(item)}
      >
        <View style={[styles.resultIcon, { backgroundColor: colors.primarySoft }]}>
          <Text style={{ fontSize: 18 }}>🏪</Text>
        </View>
        <View style={styles.resultText}>
          <Text style={[styles.resultTitle, { color: colors.text }]}>
            {item.name}
          </Text>
          <Text style={[styles.resultSub, { color: colors.text2 }]}>
            {item.distance ? `${item.distance.toFixed(1)}km · ` : ''}
            ★ {item.rating.toFixed(1)}
          </Text>
        </View>
        {!item.isVerified && (
          <View style={[styles.uvBadge, { backgroundColor: colors.warningSoft }]}>
            <Text style={[styles.uvText, { color: colors.warning }]}>
              Unverified
            </Text>
          </View>
        )}
      </Pressable>
    ),
    [colors],
  );

  const renderProductResult = useCallback(
    ({ item }: { item: SearchProduct }) => (
      <Pressable
        style={[styles.resultRow, { borderBottomColor: colors.borderFaint }]}
        onPress={() => handleProductPress(item)}
      >
        <View style={[styles.resultIcon, { backgroundColor: colors.surface2 }]}>
          <Text style={{ fontSize: 18 }}>📦</Text>
        </View>
        <View style={styles.resultText}>
          <Text style={[styles.resultTitle, { color: colors.text }]}>
            {item.name}
          </Text>
          <Text style={[styles.resultSub, { color: colors.text2 }]}>
            ₹{item.price} · {item.sellerName}
          </Text>
        </View>
      </Pressable>
    ),
    [colors],
  );

  return (
    <View
      style={[
        styles.screen,
        { backgroundColor: colors.bg, paddingTop: insets.top },
      ]}
    >
      {/* Search input row */}
      <View
        style={[
          styles.inputRow,
          { borderBottomColor: colors.border, backgroundColor: colors.bg },
        ]}
      >
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={8}
          style={styles.backBtn}
        >
          <Text style={[styles.backArrow, { color: colors.text }]}>←</Text>
        </Pressable>
        <TextInput
          ref={inputRef}
          style={[styles.input, { color: colors.text }]}
          placeholder="Search shops and products…"
          placeholderTextColor={colors.text3}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          autoCorrect={false}
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery('')} hitSlop={8} style={styles.clearBtn}>
            <Text style={[styles.clearText, { color: colors.text3 }]}>✕</Text>
          </Pressable>
        )}
        {isLoading && (
          <ActivityIndicator size="small" color={colors.primary} />
        )}
      </View>

      {/* Content */}
      {!debouncedQuery || debouncedQuery.trim().length < 2 ? (
        <EmptyState colors={colors} />
      ) : !hasResults && !isLoading ? (
        <NoResults query={debouncedQuery} colors={colors} />
      ) : (
        <FlatList
          data={[]}
          renderItem={null}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <>
              {data && data.sellers.length > 0 && (
                <View>
                  <SectionHeader title="Shops" colors={colors} />
                  <FlatList
                    data={data.sellers}
                    renderItem={renderSellerResult}
                    keyExtractor={(s) => s.id}
                    scrollEnabled={false}
                  />
                </View>
              )}
              {data && data.products.length > 0 && (
                <View>
                  <SectionHeader title="Products" colors={colors} />
                  <FlatList
                    data={data.products}
                    renderItem={renderProductResult}
                    keyExtractor={(p) => `${p.sellerId}_${p.id}`}
                    scrollEnabled={false}
                  />
                </View>
              )}
            </>
          }
        />
      )}
    </View>
  );
}

function SectionHeader({ title, colors }: { title: string; colors: ReturnType<typeof useColors> }) {
  return (
    <Text
      style={[
        styles.sectionHeader,
        { color: colors.text3, borderBottomColor: colors.borderFaint },
      ]}
    >
      {title.toUpperCase()}
    </Text>
  );
}

function EmptyState({ colors }: { colors: ReturnType<typeof useColors> }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyIcon}>🔍</Text>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        Find anything nearby
      </Text>
      <Text style={[styles.emptySub, { color: colors.text2 }]}>
        Search for shops, printing services, stationery and more
      </Text>
    </View>
  );
}

function NoResults({ query, colors }: { query: string; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyIcon}>😕</Text>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        No results for "{query}"
      </Text>
      <Text style={[styles.emptySub, { color: colors.text2 }]}>
        Try a different keyword or browse shops on the home screen
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
  },
  backBtn: { padding: 4 },
  backArrow: { fontSize: 20, fontWeight: fontWeight.bold },
  input: { flex: 1, fontSize: fontSize.body, height: 44 },
  clearBtn: { padding: 4 },
  clearText: { fontSize: 14 },
  sectionHeader: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.semibold,
    letterSpacing: 0.5,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    gap: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  resultIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultText: { flex: 1 },
  resultTitle: { fontSize: fontSize.body, fontWeight: fontWeight.medium },
  resultSub: { fontSize: fontSize.caption, marginTop: 2 },
  uvBadge: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  uvText: { fontSize: fontSize.micro, fontWeight: fontWeight.semibold },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
    paddingBottom: 80,
  },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: fontSize.title, fontWeight: fontWeight.bold, textAlign: 'center' },
  emptySub: { fontSize: fontSize.body, textAlign: 'center', lineHeight: 24 },
});
