import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  Keyboard,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useThemeColors } from '@/theme';
import { spacing } from '@/constants/spacing';
import { radius } from '@/constants/radius';
import { typography } from '@/constants/typography';
import { sellersApi, type NearbySeller } from '@/api/sellers.api';
import { productsApi, type Product } from '@/api/products.api';
import { useLocationStore } from '@/store/location.store';

interface GlobalSearchProps {
  onClose: () => void;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({ onClose }) => {
  const colors = useThemeColors();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const coords = useLocationStore((s) => s.coords);

  // Debounce query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 500);
    return () => clearTimeout(timer);
  }, [query]);

  // Search Sellers
  const { data: sellers = [], isLoading: sellersLoading } = useQuery({
    queryKey: ['search-sellers', debouncedQuery, coords?.latitude, coords?.longitude],
    queryFn: async () => {
      if (!debouncedQuery.trim() || !coords) return [];
      const res = await sellersApi.getNearbySellers({
        lat: coords.latitude,
        lng: coords.longitude,
        limit: 5,
      });
      // Filter client-side if API doesn't support query yet, 
      // or assume we'll update API later. 
      // For now, let's filter the results manually if needed, 
      // but ideally the API should handle it.
      return res.sellers.filter(s => 
        s.shopName.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
        s.description?.toLowerCase().includes(debouncedQuery.toLowerCase())
      );
    },
    enabled: debouncedQuery.length > 2 && !!coords,
  });

  // Search Products
  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ['search-products', debouncedQuery],
    queryFn: () => productsApi.searchProducts(debouncedQuery),
    enabled: debouncedQuery.length > 2,
  });

  const isLoading = (sellersLoading || productsLoading) && debouncedQuery.length > 0;
  const noResults = !isLoading && debouncedQuery.length > 2 && sellers.length === 0 && products.length === 0;

  const onSellerPress = (shopId: string) => {
    onClose();
    router.push({
      pathname: '/shop-detail',
      params: { shopId },
    });
  };

  const onProductPress = (productId: string, shopId: string) => {
    onClose();
    router.push({
      pathname: '/shop-detail',
      params: { id: shopId, productId },
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: '#000000' }]}>
      {/* Header / Search Input */}
      <View style={[styles.header, { borderBottomColor: '#333' }]}>
        <TouchableOpacity onPress={onClose} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <View style={[styles.inputContainer, { backgroundColor: '#1a1a1a' }]}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={[styles.input, { color: colors.white }]}
            placeholder="Search shops or items..."
            placeholderTextColor="#666"
            value={query}
            onChangeText={setQuery}
            autoFocus
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={18} color="#666" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Results */}
      <View style={styles.content}>
        {isLoading ? (
          <View style={styles.centerWrap}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={[styles.loadingText, { color: '#666' }]}>Searching...</Text>
          </View>
        ) : noResults ? (
          <View style={styles.centerWrap}>
            <Ionicons name="search-outline" size={64} color="#333" />
            <Text style={[styles.noResultsTitle, { color: colors.white }]}>No results found</Text>
            <Text style={[styles.noResultsDesc, { color: '#666' }]}>
              We couldn't find anything matching "{debouncedQuery}"
            </Text>
          </View>
        ) : debouncedQuery.length < 3 ? (
          <View style={styles.emptyWrap}>
            <Text style={[styles.emptyTitle, { color: '#ffffff' }]}>Search for local shops</Text>
            <Text style={[styles.emptyDesc, { color: '#666' }]}>
              Find artisans, printers, and creators near you
            </Text>
          </View>
        ) : (
          <ScrollView 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.resultsScroll}
          >
            {/* Shops Section */}
            {sellers.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: '#666' }]}>SHOPS</Text>
                {sellers.map((shop) => (
                  <TouchableOpacity 
                    key={shop.id} 
                    style={styles.itemRow}
                    onPress={() => onSellerPress(shop.id)}
                  >
                    <View style={[styles.avatar, { backgroundColor: '#1a1a1a' }]}>
                      {shop.imageUrl ? (
                        <Image source={{ uri: shop.imageUrl }} style={styles.avatarImg} />
                      ) : (
                        <Ionicons name="storefront" size={20} color={colors.primary} />
                      )}
                    </View>
                    <View style={styles.itemInfo}>
                      <Text style={[styles.itemName, { color: colors.white }]}>{shop.shopName}</Text>
                      <Text style={[styles.itemMeta, { color: '#666' }]}>
                        {shop.distance.toFixed(1)} km • {shop.rating.toFixed(1)} ★
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#333" />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Products Section */}
            {products.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: '#666' }]}>ITEMS</Text>
                {products.map((product) => (
                  <TouchableOpacity 
                    key={product.id} 
                    style={styles.itemRow}
                    onPress={() => onProductPress(product.id, product.sellerId)}
                  >
                    <View style={[styles.avatar, { backgroundColor: '#1a1a1a' }]}>
                      {product.image ? (
                        <Image source={{ uri: product.image }} style={styles.avatarImg} />
                      ) : (
                        <Ionicons name="cube-outline" size={20} color={colors.primary} />
                      )}
                    </View>
                    <View style={styles.itemInfo}>
                      <Text style={[styles.itemName, { color: colors.white }]}>{product.name}</Text>
                      <Text style={[styles.itemMeta, { color: '#666' }]}>
                        ₹{product.price}
                      </Text>
                    </View>
                    <View style={[styles.priceTag, { backgroundColor: colors.primary }]}>
                      <Text style={[styles.priceTagText, { color: '#000' }]}></Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    gap: spacing.sm,
  },
  backButton: {
    padding: spacing.xs,
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    ...typography.bodyMedium,
    height: '100%',
  },
  content: {
    flex: 1,
  },
  centerWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl * 2,
    gap: spacing.md,
  },
  loadingText: {
    ...typography.labelMedium,
    marginTop: spacing.sm,
  },
  noResultsTitle: {
    ...typography.screenTitle,
    fontWeight: '700',
    marginTop: spacing.md,
  },
  noResultsDesc: {
    ...typography.bodyMedium,
    textAlign: 'center',
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl * 2,
    gap: spacing.sm,
  },
  emptyTitle: {
    ...typography.screenTitle,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyDesc: {
    ...typography.bodyMedium,
    textAlign: 'center',
  },
  resultsScroll: {
    paddingVertical: spacing.lg,
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.labelMedium,
    letterSpacing: 1.2,
    marginBottom: spacing.sm,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  itemInfo: {
    flex: 1,
    gap: 2,
  },
  itemName: {
    ...typography.bodyMedium,
    fontWeight: '600',
  },
  itemMeta: {
    ...typography.labelMedium,
  },
  priceTag: {
    // Hidden by default, maybe use for something else
  },
  priceTagText: {
    ...typography.labelMedium,
    fontWeight: '700',
  },
});
