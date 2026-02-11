/**
 * Delivery options – show all providers with quotes and allow selection
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Loader } from '@/components/Loader';
import { colors } from '@/constants/colors';
import { useOrderDraftStore } from '@/store/order-draft.store';
import { ordersApi, type DeliveryQuoteOption } from '@/api/orders.api';

export default function DeliveryOptionsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const orderId = useOrderDraftStore((s) => s.orderId);
  const deliveryAddressId = useOrderDraftStore((s) => s.deliveryAddressId);
  const setDeliveryProvider = useOrderDraftStore((s) => s.setDeliveryProvider);
  const setDeliveryFee = useOrderDraftStore((s) => s.setDeliveryFee);

  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Get cached delivery quotes from query client
  const cachedQuotes = queryClient.getQueryData<any>(['deliveryQuotes', orderId]);
  const quotes = cachedQuotes?.options || [];

  useEffect(() => {
    if (!orderId) router.replace('/order/upload');
  }, [orderId, router]);

  // Select delivery provider mutation
  const selectMutation = useMutation({
    mutationFn: (provider: string) => {
      if (!orderId) throw new Error('Order ID missing');
      return ordersApi.selectDeliveryProvider(orderId, provider, deliveryAddressId || undefined);
    },
    onSuccess: (response) => {
      setDeliveryProvider(response.provider);
      setDeliveryFee(response.deliveryFee);
      router.push('/order/price-breakdown');
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'Failed to select provider'),
  });

  if (!orderId) return null;

  if (!quotes || quotes.length === 0) {
    return (
      <ScreenWrapper>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Delivery Partners</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loaderWrap}>
          <Text style={styles.loadingText}>No delivery options available</Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Delivery Partners</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentPadding}>
        <Text style={styles.subtitle}>Choose your preferred delivery partner</Text>

        <View style={styles.optionsList}>
          {quotes.map((option: DeliveryQuoteOption) => (
            <TouchableOpacity
              key={option.provider}
              style={[
                styles.optionCard,
                selectedProvider === option.provider && styles.optionCardSelected,
              ]}
              onPress={() => setSelectedProvider(option.provider)}
            >
              {/* Radio button */}
              <View style={[styles.radioBtn, selectedProvider === option.provider && styles.radioBtnSelected]}>
                {selectedProvider === option.provider && <View style={styles.radioBtnDot} />}
              </View>

              {/* Provider info */}
              <View style={styles.providerInfo}>
                {option.logo && (
                  <Image source={{ uri: option.logo }} style={styles.logo} />
                )}
                <View style={styles.textInfo}>
                  <Text style={styles.providerName}>{option.displayName}</Text>
                  {option.rating && (
                    <View style={styles.ratingContainer}>
                      <MaterialIcons name="star" size={14} color={colors.orange} />
                      <Text style={styles.ratingText}>{option.rating.toFixed(1)}</Text>
                    </View>
                  )}
                  {option.features && option.features.length > 0 && (
                    <View style={styles.featuresContainer}>
                      {option.features.slice(0, 2).map((feat, idx) => (
                        <Text key={idx} style={styles.featureItem}>
                          • {feat}
                        </Text>
                      ))}
                    </View>
                  )}
                </View>
              </View>

              {/* Price and ETA */}
              <View style={styles.priceSection}>
                <Text style={styles.price}>₹{option.estimatedFee}</Text>
                <Text style={styles.eta}>{option.estimatedDurationMinutes} min</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          label={selectMutation.isPending ? 'Confirming…' : 'Continue'}
          onPress={() => {
            setError(null);
            if (!selectedProvider) {
              setError('Please select a delivery partner');
              return;
            }
            selectMutation.mutate(selectedProvider);
          }}
          disabled={!selectedProvider || selectMutation.isPending}
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
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDark,
  },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: 18, fontWeight: '700', color: colors.textPrimary, textAlign: 'center' },
  placeholder: { width: 40 },
  content: { flex: 1 },
  contentPadding: { paddingVertical: 20, paddingHorizontal: 16, paddingBottom: 20 },
  subtitle: { fontSize: 14, color: colors.textMuted, marginBottom: 20, textAlign: 'center' },
  optionsList: { gap: 12, marginBottom: 20 },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: colors.surfaceDark,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.borderDark,
  },
  optionCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  radioBtn: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.textMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioBtnSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  radioBtnDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.white,
  },
  providerInfo: {
    flex: 1,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  logo: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  textInfo: {
    flex: 1,
  },
  providerName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.orange,
  },
  featuresContainer: {
    marginTop: 6,
  },
  featureItem: {
    fontSize: 11,
    color: colors.textMuted,
  },
  priceSection: {
    alignItems: 'flex-end',
    gap: 2,
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  eta: {
    fontSize: 12,
    color: colors.textMuted,
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
    textAlign: 'center',
    marginTop: 16,
  },
  footer: {
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  loaderWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: colors.textMuted,
  },
});
