/**
 * Booking Confirmed – Shows confirmation after Pick & Drop booking
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeColors, useThemedStyles } from '@/theme';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { useCartStore } from '@/store/cart.store';

export default function BookingConfirmedScreen() {
  const colors = useThemeColors();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  
  const pickupLocation = useCartStore((state) => state.pickupLocation);
  const dropLocation = useCartStore((state) => state.dropLocation);
  const selectedDeliveryProvider = useCartStore((state) => state.selectedDeliveryProvider);
  const deliveryFee = useCartStore((state) => state.deliveryFee);

  const handleTrackOrder = () => {
    router.push('/(tabs)/orders');
  };

  const handleNewBooking = () => {
    router.push('/legacy/pickup-delivery');
  };

  const bookingId = `PND${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundDark }}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Success Icon */}
        <View style={styles.successBox}>
          <View style={styles.successIconWrap}>
            <MaterialIcons name="check-circle" size={64} color={colors.primary} />
          </View>
          <Text style={styles.successTitle}>Booking Confirmed!</Text>
          <Text style={styles.successDesc}>Your pick & drop order has been successfully booked</Text>
        </View>

        {/* Booking Details */}
        <View style={styles.section}>
          <View style={styles.bookingHeader}>
            <Text style={styles.bookingLabel}>BOOKING ID</Text>
            <Text style={styles.bookingId}>{bookingId}</Text>
          </View>

          {/* Pickup Location */}
          <View style={styles.locationSection}>
            <View style={styles.locationTypeRow}>
              <View style={styles.locationTypeBadge}>
                <MaterialIcons name="location-on" size={18} color="colors.success" />
                <Text style={styles.locationTypeText}>PICKUP</Text>
              </View>
            </View>
            <View style={styles.locationBox}>
              <MaterialIcons name="home" size={24} color={colors.primary} />
              <Text style={styles.locationAddress} numberOfLines={2}>{pickupLocation?.label || 'Pickup Location'}</Text>
            </View>
          </View>

          {/* Route Arrow */}
          <View style={styles.routeArrowWrap}>
            <View style={styles.routeLine} />
            <MaterialIcons name="arrow-downward" size={24} color={colors.primary} />
            <View style={styles.routeLine} />
          </View>

          {/* Drop Location */}
          <View style={styles.locationSection}>
            <View style={styles.locationTypeRow}>
              <View style={[styles.locationTypeBadge, styles.dropBadge]}>
                <MaterialIcons name="place" size={18} color="colors.error" />
                <Text style={[styles.locationTypeText, { color: 'colors.error' }]}>DROP</Text>
              </View>
            </View>
            <View style={styles.locationBox}>
              <MaterialIcons name="location-on" size={24} color="colors.error" />
              <Text style={styles.locationAddress} numberOfLines={2}>{dropLocation?.address || 'Drop Location'}</Text>
            </View>
          </View>
        </View>

        {/* Delivery Partner & Pricing */}
        <View style={styles.section}>
          <View style={styles.partnerRow}>
            <View>
              <Text style={styles.partnerLabel}>DELIVERY PARTNER</Text>
              <Text style={styles.partnerName}>{selectedDeliveryProvider || 'Swift Express'}</Text>
            </View>
            <View style={styles.priceBox}>
              <Text style={styles.priceLabel}>DELIVERY FEE</Text>
              <Text style={styles.priceAmount}>₹{deliveryFee || 95}</Text>
            </View>
          </View>
        </View>

        {/* Timeline */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>BOOKING STATUS</Text>
          <View style={styles.timeline}>
            <View style={styles.timelineItem}>
              <View style={[styles.timelineCircle, styles.timelineCircleActive]}>
                <MaterialIcons name="check" size={14} color={colors.textPrimary} />
              </View>
              <View style={styles.timelineContent}>
                <Text style={styles.timelineTitle}>Booking Confirmed</Text>
                <Text style={styles.timelineTime}>Just now</Text>
              </View>
            </View>

            <View style={styles.timelineConnector} />

            <View style={styles.timelineItem}>
              <View style={styles.timelineCircle}>
                <Text style={styles.timelineNumber}>2</Text>
              </View>
              <View style={styles.timelineContent}>
                <Text style={styles.timelineTitle}>Driver Assigned</Text>
                <Text style={styles.timelineTime}>In 2-3 minutes</Text>
              </View>
            </View>

            <View style={styles.timelineConnector} />

            <View style={styles.timelineItem}>
              <View style={styles.timelineCircle}>
                <Text style={styles.timelineNumber}>3</Text>
              </View>
              <View style={styles.timelineContent}>
                <Text style={styles.timelineTitle}>Picked Up</Text>
                <Text style={styles.timelineTime}>~5 minutes</Text>
              </View>
            </View>

            <View style={styles.timelineConnector} />

            <View style={styles.timelineItem}>
              <View style={styles.timelineCircle}>
                <Text style={styles.timelineNumber}>4</Text>
              </View>
              <View style={styles.timelineContent}>
                <Text style={styles.timelineTitle}>Delivered</Text>
                <Text style={styles.timelineTime}>~12 minutes</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <MaterialIcons name="info" size={20} color={colors.primary} />
          <Text style={styles.infoText}>A driver will contact you shortly. Keep your phone available.</Text>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.btn, styles.trackBtn]}
          onPress={handleTrackOrder}
        >
          <MaterialIcons name="track-changes" size={20} color={colors.textPrimary} />
          <Text style={styles.trackBtnText}>Track Order</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, styles.newBookingBtn]}
          onPress={handleNewBooking}
        >
          <MaterialIcons name="add" size={20} color={colors.primary} />
          <Text style={styles.newBookingBtnText}>New Booking</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    paddingBottom: spacing.xl + spacing.lg,
  },
  successBox: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  successIconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  successTitle: {
    ...typography.screenTitle,
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: spacing.sm,
  },
  successDesc: {
    ...typography.secondary,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  section: {
    backgroundColor: colors.surfaceDark,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderDark,
  },
  bookingHeader: {
    alignItems: 'center',
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDark,
    marginBottom: spacing.md,
  },
  bookingLabel: {
    ...typography.meta,
    color: colors.textMuted,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  bookingId: {
    ...typography.screenTitle,
    color: colors.primary,
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: spacing.xs,
  },
  locationSection: {
    marginBottom: spacing.md,
  },
  locationTypeRow: {
    marginBottom: spacing.sm,
  },
  locationTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'colors.successBg',
    borderRadius: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs - 2,
    alignSelf: 'flex-start',
  },
  dropBadge: {
    backgroundColor: 'colors.errorBg',
  },
  locationTypeText: {
    ...typography.overline,
    color: 'colors.success',
    fontWeight: 'bold',
    fontSize: 11,
  },
  locationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: spacing.md,
    gap: spacing.md,
  },
  locationAddress: {
    ...typography.secondary,
    color: colors.textPrimary,
    flex: 1,
    fontWeight: '600',
  },
  routeArrowWrap: {
    alignItems: 'center',
    marginVertical: spacing.md,
    gap: spacing.xs,
  },
  routeLine: {
    width: 2,
    height: 12,
    backgroundColor: colors.primary,
  },
  partnerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  partnerLabel: {
    ...typography.meta,
    color: colors.textMuted,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  partnerName: {
    ...typography.secondary,
    color: colors.primary,
    fontWeight: 'bold',
    fontSize: 16,
  },
  priceBox: {
    alignItems: 'flex-end',
  },
  priceLabel: {
    ...typography.meta,
    color: colors.textMuted,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  priceAmount: {
    ...typography.screenTitle,
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  sectionLabel: {
    ...typography.meta,
    color: colors.textMuted,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  timeline: {
    marginLeft: spacing.md,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
  },
  timelineCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.borderDark,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
    marginTop: spacing.xs,
  },
  timelineCircleActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  timelineNumber: {
    ...typography.meta,
    color: colors.textMuted,
    fontWeight: 'bold',
    fontSize: 13,
  },
  timelineContent: {
    flex: 1,
  },
  timelineTitle: {
    ...typography.secondary,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  timelineTime: {
    ...typography.meta,
    color: colors.textMuted,
    marginTop: spacing.xxs,
  },
  timelineConnector: {
    width: 2,
    height: 20,
    backgroundColor: colors.borderDark,
    marginLeft: 15,
    marginBottom: 0,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: colors.primaryLight,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  infoText: {
    ...typography.secondary,
    color: colors.textPrimary,
    flex: 1,
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: colors.backgroundDark,
    borderTopWidth: 1,
    borderTopColor: colors.borderDark,
  },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: 12,
    paddingVertical: spacing.md,
  },
  trackBtn: {
    backgroundColor: colors.primary,
  },
  trackBtnText: {
    ...typography.secondary,
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: 15,
  },
  newBookingBtn: {
    backgroundColor: colors.surfaceDark,
    borderWidth: 1,
    borderColor: colors.borderDark,
  },
  newBookingBtnText: {
    ...typography.secondary,
    color: colors.primary,
    fontWeight: '700',
    fontSize: 15,
  },
});
