/**
 * Delivery – select address (add/choose), then fetch and show delivery options from multiple providers.
 */
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Loader } from '@/components/Loader';
import { colors } from '@/constants/colors';
import { useOrderDraftStore } from '@/store/order-draft.store';
import { useLocationStore } from '@/store/location.store';
import { ordersApi } from '@/api/orders.api';
import { usersApi, type UserAddressItem } from '@/api/users.api';

export default function DeliveryScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams();
  const orderId = useOrderDraftStore((s) => s.orderId);
  const coords = useLocationStore((s) => s.coords);

  const [error, setError] = useState<string | null>(null);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    (params?.selectedAddressId as string) || null
  );

  // Fetch user addresses
  const { data: addresses = [], isLoading: addressesLoading } = useQuery({
    queryKey: ['addresses'],
    queryFn: () => usersApi.getMyAddresses(),
  });

  // Fetch delivery quotes mutation
  const quotesMutation = useMutation({
    mutationFn: async (addressId: string) => {
      if (!orderId) throw new Error('Order missing');

      const address = addresses.find((a) => a.id === addressId);
      if (!address) throw new Error('Address not found');

      const dropLocation = {
        lat: address.latitude || 0,
        lng: address.longitude || 0,
        address: address.addressLine,
      };

      const response = await ordersApi.getAllDeliveryQuotes(orderId, dropLocation);
      
      // Cache the quotes response
      queryClient.setQueryData(['deliveryQuotes', orderId], response);
      
      return response;
    },
    onSuccess: () => {
      router.push('/order/delivery-options');
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'Failed to get delivery quotes'),
  });

  useEffect(() => {
    if (!orderId) router.replace('/order/upload');
  }, [orderId, router]);

  if (!orderId) return null;

  // Show loader while fetching addresses
  if (addressesLoading) {
    return (
      <ScreenWrapper>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Delivery Address</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loaderWrap}>
          <Loader />
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
        <Text style={styles.title}>Delivery Address</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentPadding}>
        {/* Show addresses if available */}
        {addresses.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>Saved Addresses</Text>
            <View style={styles.addressList}>
              {addresses.map((addr) => (
                <TouchableOpacity
                  key={addr.id}
                  style={[styles.addressCard, selectedAddressId === addr.id && styles.addressCardSelected]}
                  onPress={() => setSelectedAddressId(addr.id)}
                >
                  <View style={styles.addressCardContent}>
                    <View style={[styles.radioBtn, selectedAddressId === addr.id && styles.radioBtnSelected]}>
                      {selectedAddressId === addr.id && <View style={styles.radioBtnDot} />}
                    </View>
                    <View style={styles.addressInfo}>
                      <Text style={styles.addressLabel}>{addr.label}</Text>
                      <Text style={styles.addressLine}>{addr.addressLine}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Add new address option */}
        <TouchableOpacity
          style={styles.addAddressBtn}
          onPress={() =>
            router.push({
              pathname: '/(tabs)/profile/add-address',
              params: { returnTo: '/order/delivery' },
            })
          }
        >
          <MaterialIcons name="add-circle-outline" size={24} color={colors.primary} />
          <Text style={styles.addAddressText}>Add New Address</Text>
        </TouchableOpacity>

        {/* Error message */}
        {error && <Text style={styles.errorText}>{error}</Text>}
      </ScrollView>

      {/* Continue button */}
      <View style={styles.footer}>
        <PrimaryButton
          label={quotesMutation.isPending ? 'Getting quotes…' : 'Continue to Delivery Options'}
          onPress={() => {
            setError(null);
            if (!selectedAddressId) {
              setError('Please select or add a delivery address');
              return;
            }
            quotesMutation.mutate(selectedAddressId);
          }}
          disabled={!selectedAddressId || quotesMutation.isPending}
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
  contentPadding: { paddingTop: 20, paddingHorizontal: 16, paddingBottom: 20 },
  sectionLabel: { fontSize: 14, fontWeight: '600', color: colors.textMuted, marginBottom: 12 },
  addressList: { gap: 12, marginBottom: 24 },
  addressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.surfaceDark,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.borderDark,
  },
  addressCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  addressCardContent: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, flex: 1 },
  radioBtn: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.textMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  radioBtnSelected: { borderColor: colors.primary, backgroundColor: colors.primary },
  radioBtnDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.white },
  addressInfo: { flex: 1 },
  addressLabel: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  addressLine: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  addAddressBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: colors.surfaceDark,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
  },
  addAddressText: { fontSize: 14, fontWeight: '600', color: colors.primary },
  errorText: { fontSize: 14, color: colors.error, marginTop: 16, textAlign: 'center' },
  footer: { paddingVertical: 24, paddingHorizontal: 16 },
  loaderWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
