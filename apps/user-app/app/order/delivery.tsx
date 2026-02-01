/**
 * Delivery – use current location for quote, then continue to price breakdown.
 */
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Loader } from '@/components/Loader';
import { colors } from '@/constants/colors';
import { useOrderDraftStore } from '@/store/order-draft.store';
import { useLocationStore } from '@/store/location.store';
import { ordersApi } from '@/api/orders.api';

type DeliveryType = 'delivery' | 'pickup';

export default function DeliveryScreen() {
  const router = useRouter();
  const orderId = useOrderDraftStore((s) => s.orderId);
  const coords = useLocationStore((s) => s.coords);
  const label = useLocationStore((s) => s.coords?.label);
  const fetchLocation = useLocationStore((s) => s.fetchLocation);
  const locationLoading = useLocationStore((s) => s.loading);
  const locationError = useLocationStore((s) => s.error);

  const [type, setType] = useState<DeliveryType>('delivery');
  const [error, setError] = useState<string | null>(null);

  const quoteMutation = useMutation({
    mutationFn: async () => {
      if (!orderId || !coords) throw new Error('Order or location missing');
      return ordersApi.getDeliveryQuote(orderId, { lat: coords.latitude, lng: coords.longitude });
    },
    onSuccess: () => router.push('/order/price-breakdown'),
    onError: (e) => setError(e instanceof Error ? e.message : 'Failed to get delivery quote'),
  });

  useEffect(() => {
    if (!orderId) router.replace('/order/upload');
  }, [orderId, router]);

  const onUseLocation = async () => {
    setError(null);
    await fetchLocation();
  };

  const onContinue = () => {
    setError(null);
    if (type === 'pickup') {
      router.push('/order/price-breakdown');
      return;
    }
    if (!coords) {
      setError('Please set your delivery location');
      return;
    }
    quoteMutation.mutate();
  };

  const addressLabel = label || (coords ? `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}` : null);
  const addressLine = coords ? 'Delivery to this location' : 'Tap to use current location';

  if (!orderId) return null;

  return (
    <ScreenWrapper>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Delivery</Text>
        <View style={styles.placeholder} />
      </View>
      <View style={styles.content}>
        <TouchableOpacity
          style={[styles.option, type === 'delivery' && styles.optionActive]}
          onPress={() => setType('delivery')}
        >
          <MaterialIcons name="local-shipping" size={24} color={type === 'delivery' ? colors.primary : colors.textMuted} />
          <View style={styles.optionText}>
            <Text style={[styles.optionLabel, type === 'delivery' && styles.optionLabelActive]}>Delivery</Text>
            <Text style={styles.optionHint}>Get it delivered to your address</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.option, type === 'pickup' && styles.optionActive]}
          onPress={() => setType('pickup')}
        >
          <MaterialIcons name="storefront" size={24} color={type === 'pickup' ? colors.primary : colors.textMuted} />
          <View style={styles.optionText}>
            <Text style={[styles.optionLabel, type === 'pickup' && styles.optionLabelActive]}>Self Pickup</Text>
            <Text style={styles.optionHint}>Collect from the shop</Text>
          </View>
        </TouchableOpacity>
        {type === 'delivery' && (
          <TouchableOpacity style={styles.addressCard} onPress={onUseLocation} disabled={locationLoading}>
            {locationLoading ? (
              <Loader />
            ) : (
              <>
                <MaterialIcons name="location-on" size={22} color={colors.primary} />
                <View style={styles.addressText}>
                  <Text style={styles.addressLabel}>{addressLabel || 'Set location'}</Text>
                  <Text style={styles.addressLine}>{addressLine}</Text>
                  {locationError ? <Text style={styles.addressError}>{locationError}</Text> : null}
                </View>
              </>
            )}
          </TouchableOpacity>
        )}
        {error || quoteMutation.isError ? (
          <Text style={styles.errorText}>{error || (quoteMutation.error as Error)?.message}</Text>
        ) : null}
      </View>
      <View style={styles.footer}>
        <PrimaryButton
          label={quoteMutation.isPending ? 'Getting quote…' : 'Continue'}
          onPress={onContinue}
          disabled={(type === 'delivery' && !coords) || quoteMutation.isPending}
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
  },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: 18, fontWeight: '700', color: colors.textPrimary, textAlign: 'center' },
  placeholder: { width: 40 },
  content: { flex: 1, paddingTop: 24, gap: 12 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    backgroundColor: colors.surfaceDark,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderDark,
  },
  optionActive: { borderColor: colors.primary },
  optionText: { flex: 1 },
  optionLabel: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  optionLabelActive: { color: colors.primary },
  optionHint: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  addressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: colors.surfaceDark,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderDark,
    marginTop: 16,
  },
  addressText: { flex: 1 },
  addressLabel: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  addressLine: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  addressError: { fontSize: 12, color: colors.error, marginTop: 4 },
  errorText: { fontSize: 14, color: colors.error, marginTop: 12 },
  footer: { paddingVertical: 24 },
});
