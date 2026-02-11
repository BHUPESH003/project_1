/**
 * Price breakdown – show itemCost, deliveryFee, and selected provider details
 */
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { MaterialIcons } from '@expo/vector-icons';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Loader } from '@/components/Loader';
import { colors } from '@/constants/colors';
import { useOrderDraftStore } from '@/store/order-draft.store';
import { ordersApi } from '@/api/orders.api';

const PROVIDER_INFO: Record<string, { displayName: string; logo: string; color: string }> = {
  UBER_DIRECT: {
    displayName: 'Uber Direct',
    logo: 'https://d3i4yxn8pp0osx.cloudfront.net/8f50c12e-5e65-4dd5-8fcc-8de7c996a91a.jpg',
    color: '#000',
  },
  DUNZO: {
    displayName: 'Dunzo',
    logo: 'https://media.licdn.com/dms/image/D4D0BAQHhE4s0NlEhZQ/company-logo_200_200/0/1682063456309/dunzo_logo?e=2147483647&v=beta&t=s8z8z8z8z8z8z8z',
    color: '#FFB627',
  },
  PORTER: {
    displayName: 'Porter',
    logo: 'https://d3lzcn6mbbadaf.cloudfront.net/media/images/1611050131.png',
    color: '#FF5C52',
  },
};

export default function PriceBreakdownScreen() {
  const router = useRouter();
  const orderId = useOrderDraftStore((s) => s.orderId);
  const deliveryProvider = useOrderDraftStore((s) => s.deliveryProvider);
  const deliveryFee = useOrderDraftStore((s) => s.deliveryFee);
  const file = useOrderDraftStore((s) => s.file);

  const { data: order, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => ordersApi.getOrder(orderId!),
    enabled: !!orderId,
    refetchOnMount: true,
  });

  useEffect(() => {
    if (!orderId) router.replace('/order/upload');
  }, [orderId, router]);

  const onContinue = () => router.push('/order/review');

  if (!orderId) return null;

  if (isLoading) {
    return (
      <ScreenWrapper>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Price Breakdown</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loaderWrap}>
          <Loader />
        </View>
      </ScreenWrapper>
    );
  }

  if (isError) {
    return (
      <ScreenWrapper>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Price Breakdown</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.errorWrap}>
          <Text style={styles.errorText}>{(error as Error)?.message ?? 'Failed to load order'}</Text>
        </View>
      </ScreenWrapper>
    );
  }

  const p = order?.pricing ?? {};
  const printing = p.itemCost ?? 0;
  const delivery = deliveryFee ?? p.deliveryFee ?? 0;
  const total = printing + delivery;

  // Validate that we have valid pricing before showing
  const hasPrintingCost = printing > 0;
  const hasDeliveryFee = delivery > 0;
  const hasValidTotal = total > 0;

  const providerInfo = deliveryProvider ? PROVIDER_INFO[deliveryProvider] : null;

  return (
    <ScreenWrapper>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Price Breakdown</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentPadding}>
        {/* File Info Card */}
        {file && (
          <View style={styles.fileInfoCard}>
            <View style={styles.fileInfoRow}>
              <MaterialIcons name="picture-as-pdf" size={24} color={colors.primary} />
              <View style={styles.fileInfoContent}>
                <Text style={styles.fileInfoLabel}>File</Text>
                <Text style={styles.fileInfoName} numberOfLines={1}>{file.fileName}</Text>
              </View>
            </View>
            {file.pageCount && (
              <View style={styles.pageCountBadge}>
                <MaterialIcons name="pages" size={14} color={colors.white} />
                <Text style={styles.pageCountText}>{file.pageCount} {file.pageCount === 1 ? 'page' : 'pages'}</Text>
              </View>
            )}
          </View>
        )}

        {/* Delivery Partner Card */}
        {providerInfo && (
          <View style={styles.partnerCard}>
            <View style={styles.partnerHeader}>
              <Text style={styles.partnerLabel}>Delivery Partner</Text>
              <TouchableOpacity onPress={() => router.back()}>
                <Text style={styles.changeLink}>Change</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.partnerInfo}>
              <Image source={{ uri: providerInfo.logo }} style={styles.partnerLogo} />
              <Text style={styles.partnerName}>{providerInfo.displayName}</Text>
            </View>
          </View>
        )}

        {/* Price breakdown */}
        {!hasValidTotal ? (
          <View style={styles.errorCard}>
            <MaterialIcons name="warning" size={24} color={colors.error} />
            <Text style={styles.errorMessage}>
              Unable to load pricing details. Please ensure a seller has been selected for your order.
            </Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => router.back()}
            >
              <Text style={styles.retryBtnText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.breakdownCard}>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Printing cost</Text>
                <Text style={styles.rowValue}>₹{printing.toFixed(2)}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.row}>
                <View>
                  <Text style={styles.rowLabel}>Delivery fee</Text>
                  {providerInfo && (
                    <Text style={styles.rowSubtext}>{providerInfo.displayName}</Text>
                  )}
                </View>
                <Text style={styles.rowValue}>₹{delivery.toFixed(2)}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.row}>
                <Text style={styles.totalLabel}>Total Amount</Text>
                <Text style={styles.totalValue}>₹{total.toFixed(2)}</Text>
              </View>
            </View>

            {/* Summary text */}
            <View style={styles.summaryCard}>
              <MaterialIcons name="info" size={18} color={colors.primary} />
              <Text style={styles.summaryText}>
                Your order will be delivered by {providerInfo?.displayName || 'selected partner'}. You will be charged ₹{total.toFixed(2)} upon delivery confirmation.
              </Text>
            </View>
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton 
          label="Proceed to Payment" 
          onPress={onContinue}
          disabled={!hasValidTotal}
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
  loaderWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorText: { fontSize: 14, color: colors.error },
  fileInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceDark,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.borderDark,
  },
  fileInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  fileInfoContent: { flex: 1 },
  fileInfoLabel: { fontSize: 12, fontWeight: '600', color: colors.textMuted, textTransform: 'uppercase' },
  fileInfoName: { fontSize: 14, fontWeight: '600', color: colors.textPrimary, marginTop: 2 },
  pageCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  pageCountText: { fontSize: 12, fontWeight: '600', color: colors.white },
  partnerCard: {
    backgroundColor: colors.surfaceDark,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.borderDark,
  },
  partnerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  partnerLabel: { fontSize: 12, fontWeight: '600', color: colors.textMuted, textTransform: 'uppercase' },
  changeLink: { fontSize: 12, color: colors.primary, fontWeight: '600' },
  partnerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  partnerLogo: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  partnerName: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  breakdownCard: {
    backgroundColor: colors.surfaceDark,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.borderDark,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  rowLabel: { fontSize: 14, color: colors.textSecondary, fontWeight: '500' },
  rowSubtext: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  rowValue: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  divider: { height: 1, backgroundColor: colors.borderDark },
  totalLabel: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  totalValue: { fontSize: 20, fontWeight: '700', color: colors.primary },
  summaryCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: colors.primaryLight,
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  summaryText: { flex: 1, fontSize: 13, color: colors.textPrimary, lineHeight: 18 },
  errorCard: {
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surfaceDark,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.error,
  },
  errorMessage: { fontSize: 14, color: colors.textPrimary, textAlign: 'center', lineHeight: 20 },
  retryBtn: {
    marginTop: 12,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  retryBtnText: { fontSize: 14, fontWeight: '600', color: colors.white },
  footer: { paddingVertical: 24, paddingHorizontal: 16 },
});
