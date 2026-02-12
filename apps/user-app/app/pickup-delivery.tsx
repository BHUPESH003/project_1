/**
 * Pick & Drop – Instant delivery booking with location selection and delivery partner choice
 */
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  SafeAreaView,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { useLocationStore } from '@/store/location.store';
import { useCartStore } from '@/store/cart.store';
import { sellersApi } from '@/api/sellers.api';

// Dummy delivery partners
const DUMMY_DELIVERY_PARTNERS = [
  {
    id: 'swift-express',
    name: 'Swift Express',
    label: 'RECOMMENDED',
    price: 95,
    time: 12,
    feature: 'Fastest delivery',
    icon: 'flash-on',
    type: 'fastest',
  },
  {
    id: 'eco-cargo',
    name: 'Eco-Cargo',
    description: 'Reliable handling',
    price: 65,
    time: 28,
    icon: 'local-shipping',
    type: 'cheapest',
  },
  {
    id: 'city-runner',
    name: 'City Runner',
    description: 'Small parcels',
    price: 45,
    time: 45,
    icon: 'two-wheeler',
    type: 'economy',
  },
];

const SAVED_LOCATIONS = [
  {
    id: 'home',
    label: 'Home',
    icon: 'home',
    address: 'Sunset Boulevard, 42',
    distance: 2.3,
  },
  {
    id: 'office',
    label: 'Office',
    icon: 'work',
    address: 'Business District, Downtown',
    distance: 5.1,
  },
  {
    id: 'gym',
    label: 'Gym',
    icon: 'fitness-center',
    address: 'Fitness Street, 123',
    distance: 3.8,
  },
];

const PACKAGE_SIZES = ['SMALL', 'MEDIUM', 'LARGE', 'EXTRA_LARGE'];

// Mock vehicle types by partner (normally from API)
const VEHICLE_TYPES_BY_PARTNER: Record<string, Array<{ id: string; name: string; capacity: string; price: number; icon: string; description: string }>> = {
  'swift-express': [
    { id: 'bike', name: 'Bike', capacity: '5kg', price: 10, icon: 'two-wheeler', description: 'Lightweight & Fast' },
    { id: 'auto', name: 'Auto', capacity: '15kg', price: 15, icon: 'auto-rickshaw', description: 'Compact & Affordable' },
    { id: 'van', name: 'Mini Van', capacity: '50kg', price: 25, icon: 'local-shipping', description: 'Medium Load' },
  ],
  'eco-cargo': [
    { id: 'bike', name: 'E-Bike', capacity: '5kg', price: 8, icon: 'two-wheeler', description: 'Eco Friendly' },
    { id: 'auto', name: 'Auto', capacity: '15kg', price: 12, icon: 'auto-rickshaw', description: 'Cost Effective' },
    { id: 'van', name: 'Van', capacity: '40kg', price: 18, icon: 'local-shipping', description: 'Larger Package' },
  ],
  'city-runner': [
    { id: 'bike', name: 'Bike', capacity: '5kg', price: 8, icon: 'two-wheeler', description: 'Quick Delivery' },
    { id: 'auto', name: 'Auto', capacity: '12kg', price: 10, icon: 'auto-rickshaw', description: 'Budget Friendly' },
  ],
};

export default function PickupDeliveryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const locationCoords = useLocationStore((s) => s.coords);
  const locationLabel = useLocationStore((s) => s.coords?.label);
  
  // Cart store setters for delivery info
  const storeSetDeliveryProvider = useCartStore((state) => state.setDeliveryProvider);
  const storeSetDeliveryFee = useCartStore((state) => state.setDeliveryFee);
  const storeSetPickupLocation = useCartStore((state) => state.setPickupLocation);
  const storeSetDropLocation = useCartStore((state) => state.setDropLocation);

  const [pickupLocationText, setPickupLocationText] = useState('Sunset Boulevard, 42');
  const [pickupTab, setPickupTab] = useState('home');
  const [dropLocationText, setDropLocationText] = useState('Ocean Avenue, 108');
  const [dropLocationLabel, setDropLocationLabel] = useState('OFFICE');
  const [packageDesc, setPackageDesc] = useState('Ex: Laptop, 2kg, Fragile...');
  const [packageSize, setPackageSize] = useState('SMALL');
  const [selectedPartner, setSelectedPartner] = useState('');
  const [selectedVehicleType, setSelectedVehicleType] = useState('');
  const [sortBy, setSortBy] = useState('fastest');
  const [isEditingPickup, setIsEditingPickup] = useState(false);
  
  // Flow step tracking: 'location' | 'partner' | 'vehicle'
  const [flowStep, setFlowStep] = useState<'location' | 'partner' | 'vehicle'>('location');

  // Helper: Check if both locations are filled
  const areLocationsSelected = () => {
    return pickupLocationText.trim().length > 0 && dropLocationText.trim().length > 0;
  };

  // Helper: Get vehicle types for selected partner
  const getVehicleTypesForPartner = (partnerId: string) => {
    return VEHICLE_TYPES_BY_PARTNER[partnerId] || [];
  };

  // Helper: Handle partner selection
  const handlePartnerSelect = (partnerId: string) => {
    setSelectedPartner(partnerId);
    setSelectedVehicleType(''); // Reset vehicle type
    setFlowStep('vehicle'); // Move to vehicle selection
  };

  // Helper: Handle vehicle type selection and finalization
  const handleVehicleTypeSelect = (vehicleTypeId: string) => {
    setSelectedVehicleType(vehicleTypeId);
  };

  // Helper: Confirm booking
  const handleConfirmBooking = () => {
    if (!selectedPartner || !selectedVehicleType) return;

    const partner = DUMMY_DELIVERY_PARTNERS.find((p) => p.id === selectedPartner);
    const vehicleTypes = getVehicleTypesForPartner(selectedPartner);
    const selectedVehicle = vehicleTypes.find((v) => v.id === selectedVehicleType);

    // Store delivery info in cart
    storeSetDeliveryProvider(partner?.name || 'Delivery Partner');
    storeSetDeliveryFee((partner?.price || 0) + (selectedVehicle?.price || 0));
    storeSetPickupLocation({
      lat: locationCoords?.latitude || 0,
      lng: locationCoords?.longitude || 0,
      label: pickupLocationText,
    });
    storeSetDropLocation({
      lat: 0,
      lng: 0,
      address: dropLocationText,
    });

    // Navigate to booking confirmation page
    router.push('/booking-confirmed');
  };

  // Fetch nearby delivery partners
  const { data: partnersData } = useQuery({
    queryKey: ['delivery-partners', locationCoords?.latitude, locationCoords?.longitude],
    queryFn: () =>
      sellersApi.getAvailableSellers?.({
        lat: locationCoords?.latitude,
        lng: locationCoords?.longitude,
      }),
    enabled: Boolean(locationCoords?.latitude && locationCoords?.longitude),
  });

  // Use API data or fallback to dummy
  const partners = useMemo(() => {
    if (!partnersData || !Array.isArray(partnersData) || partnersData.length === 0) {
      return DUMMY_DELIVERY_PARTNERS;
    }
    // Map API sellers to delivery partner format
    return DUMMY_DELIVERY_PARTNERS;
  }, [partnersData]);

  // Sort partners based on selection
  const sortedPartners = useMemo(() => {
    const sorted = [...partners];
    if (sortBy === 'fastest') {
      return sorted.sort((a, b) => a.time - b.time);
    }
    if (sortBy === 'cheapest') {
      return sorted.sort((a, b) => a.price - b.price);
    }
    return sorted;
  }, [partners, sortBy]);

  const selectedPartnerData = partners.find((p) => p.id === selectedPartner);

  // Handle saved location selection
  const handleSelectSavedLocation = (location: (typeof SAVED_LOCATIONS)[0]) => {
    setPickupTab(location.id);
    setPickupLocationText(location.address);
  };

  // Check if ready to proceed to partners
  const handleProceedToPartners = () => {
    if (areLocationsSelected()) {
      setFlowStep('partner');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundDark }}>
      <View style={{ flex: 1, backgroundColor: colors.backgroundDark }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={styles.headerTitle}>Pick & Drop</Text>
            <Text style={styles.headerSubtitle}>BOOK INSTANT DELIVERY</Text>
          </View>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: spacing.xl + insets.bottom }}
          showsVerticalScrollIndicator={false}
        >
          {/* STEP 1: Location Selection */}
          {flowStep === 'location' && (
            <>
              {/* Location Selection Input Section */}
              <View style={styles.locationInputSection}>
                {/* Pickup Input */}
                <View style={styles.inputRow}>
                  <View style={styles.lineConnector}>
                    <View style={styles.dotTop} />
                    <View style={styles.lineBetween} />
                    <View style={styles.dotBottom} />
                  </View>
                  <View style={styles.inputFieldWrapper}>
                    <TextInput
                      style={styles.locationInput}
                      placeholder="Enter pickup location"
                      placeholderTextColor={colors.textMuted}
                      value={pickupLocationText}
                      onChangeText={setPickupLocationText}
                    />
                  </View>
                </View>

                {/* Dropoff Input */}
                <View style={styles.inputRow}>
                  <View style={styles.lineConnector} />
                  <View style={styles.inputFieldWrapper}>
                    <TextInput
                      style={styles.locationInput}
                      placeholder="Choose recipient's location"
                      placeholderTextColor={colors.textMuted}
                      value={dropLocationText}
                      onChangeText={setDropLocationText}
                    />
                  </View>
                </View>
              </View>

              {/* Saved Places Section */}
              <View style={styles.savedPlacesSection}>
                <View style={styles.savedPlacesHeader}>
                  <MaterialIcons name="stars" size={20} color={colors.textPrimary} />
                  <Text style={styles.savedPlacesTitle}>Saved places</Text>
                </View>

                {/* Saved Locations List */}
                {SAVED_LOCATIONS.map((location) => (
                  <TouchableOpacity
                    key={location.id}
                    style={styles.savedLocationItem}
                    onPress={() => {
                      setPickupLocationText(location.address);
                      setPickupTab(location.id);
                    }}
                  >
                    <View style={styles.savedLocationIcon}>
                      <MaterialIcons name={location.icon as any} size={20} color={colors.primary} />
                    </View>
                    <View style={styles.savedLocationContent}>
                      <Text style={styles.savedLocationName}>{location.label}</Text>
                      <Text style={styles.savedLocationAddress}>{location.address}</Text>
                      {location.distance && (
                        <Text style={styles.savedLocationDistance}>{location.distance} km</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}

                {/* Set Location on Map */}
                <TouchableOpacity style={styles.mapLocationItem}>
                  <View style={styles.mapLocationIcon}>
                    <MaterialIcons name="location-on" size={20} color={colors.primary} />
                  </View>
                  <Text style={styles.mapLocationText}>Set location on map</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* STEP 2: Partner Selection */}
          {flowStep === 'partner' && (
            <View style={styles.section}>
              <View style={styles.partnersHeader}>
                <Text style={styles.sectionLabel}>AVAILABLE PARTNERS</Text>
                <View style={styles.sortTabs}>
                  <TouchableOpacity
                    style={[styles.sortTab, sortBy === 'fastest' && styles.sortTabActive]}
                    onPress={() => setSortBy('fastest')}
                  >
                    <MaterialIcons
                      name="flash-on"
                      size={14}
                      color={sortBy === 'fastest' ? colors.primary : colors.textMuted}
                    />
                    <Text
                      style={[
                        styles.sortTabText,
                        sortBy === 'fastest' && styles.sortTabTextActive,
                      ]}
                    >
                      FASTEST
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.sortTab, sortBy === 'cheapest' && styles.sortTabActive]}
                    onPress={() => setSortBy('cheapest')}
                  >
                    <Text
                      style={[
                        styles.sortTabText,
                        sortBy === 'cheapest' && styles.sortTabTextActive,
                      ]}
                    >
                      CHEAPEST
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {sortedPartners.map((partner) => (
                <TouchableOpacity
                  key={partner.id}
                  style={[
                    styles.partnerCard,
                    selectedPartner === partner.id && styles.partnerCardSelected,
                  ]}
                  onPress={() => handlePartnerSelect(partner.id)}
                >
                  <View style={styles.partnerIconWrap}>
                    <MaterialIcons
                      name={partner.icon as any}
                      size={28}
                      color={colors.textPrimary}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <View style={styles.partnerNameRow}>
                      <Text style={styles.partnerName}>{partner.name}</Text>
                      {partner.label && (
                        <View style={styles.partnerBadge}>
                          <Text style={styles.partnerBadgeText}>{partner.label}</Text>
                        </View>
                      )}
                    </View>
                    {partner.description && (
                      <Text style={styles.partnerDescription}>{partner.description}</Text>
                    )}
                    {partner.feature && (
                      <Text style={styles.partnerFeature}>{partner.feature}</Text>
                    )}
                  </View>

                  <View style={styles.partnerPriceWrap}>
                    <Text style={styles.partnerPrice}>₹{partner.price}</Text>
                    <Text style={styles.partnerTime}>{partner.time} MINS</Text>
                  </View>

                  <View
                    style={[
                      styles.partnerRadio,
                      selectedPartner === partner.id && styles.partnerRadioSelected,
                    ]}
                  >
                    {selectedPartner === partner.id && (
                      <View style={styles.partnerRadioInner} />
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* STEP 3: Vehicle Type Selection */}
          {flowStep === 'vehicle' && selectedPartner && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>SELECT VEHICLE TYPE</Text>
              <Text style={styles.vehicleSubtitle}>Choose vehicle based on your package size</Text>

              {getVehicleTypesForPartner(selectedPartner).map((vehicle) => (
                <TouchableOpacity
                  key={vehicle.id}
                  style={[
                    styles.vehicleCard,
                    selectedVehicleType === vehicle.id && styles.vehicleCardSelected,
                  ]}
                  onPress={() => handleVehicleTypeSelect(vehicle.id)}
                >
                  <View style={styles.vehicleIconWrap}>
                    <MaterialIcons
                      name={vehicle.icon as any}
                      size={32}
                      color={colors.primary}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.vehicleName}>{vehicle.name}</Text>
                    <Text style={styles.vehicleCapacity}>{vehicle.capacity} capacity</Text>
                    <Text style={styles.vehicleDesc}>{vehicle.description}</Text>
                  </View>

                  <View style={styles.vehiclePriceWrap}>
                    <Text style={styles.vehiclePrice}>+₹{vehicle.price}</Text>
                  </View>

                  <View
                    style={[
                      styles.vehicleRadio,
                      selectedVehicleType === vehicle.id && styles.vehicleRadioSelected,
                    ]}
                  >
                    {selectedVehicleType === vehicle.id && (
                      <View style={styles.vehicleRadioInner} />
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>

        {/* Footer Buttons - Conditional based on flow step */}
        <View style={[styles.footer, { paddingBottom: spacing.md + insets.bottom }]}>
          {flowStep === 'location' && (
            <TouchableOpacity
              style={[
                styles.confirmBtn,
                !areLocationsSelected() && styles.confirmBtnDisabled,
              ]}
              onPress={handleProceedToPartners}
              disabled={!areLocationsSelected()}
            >
              <Text style={styles.confirmBtnText}>Select Partner</Text>
              <MaterialIcons name="arrow-forward" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          )}

          {flowStep === 'partner' && (
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.secondaryBtn]}
                onPress={() => setFlowStep('location')}
              >
                <MaterialIcons name="arrow-back" size={20} color={colors.primary} />
                <Text style={styles.secondaryBtnText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.confirmBtn,
                  !selectedPartner && styles.confirmBtnDisabled,
                ]}
                onPress={() => {
                  if (selectedPartner) handlePartnerSelect(selectedPartner);
                }}
                disabled={!selectedPartner}
              >
                <Text style={styles.confirmBtnText}>Continue</Text>
                <MaterialIcons name="arrow-forward" size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
          )}

          {flowStep === 'vehicle' && (
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.secondaryBtn]}
                onPress={() => setFlowStep('partner')}
              >
                <MaterialIcons name="arrow-back" size={20} color={colors.primary} />
                <Text style={styles.secondaryBtnText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.confirmBtn,
                  !selectedVehicleType && styles.confirmBtnDisabled,
                ]}
                onPress={handleConfirmBooking}
                disabled={!selectedVehicleType}
              >
                <Text style={styles.confirmBtnText}>Confirm Booking</Text>
                <MaterialIcons name="check" size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDark,
  },
  headerTitle: {
    ...typography.screenTitle,
    color: colors.textPrimary,
    fontSize: 22,
  },
  headerSubtitle: {
    ...typography.meta,
    color: colors.textMuted,
    marginTop: spacing.xxs,
  },
  scroll: {
    flex: 1,
  },
  section: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
  },
  sectionLabel: {
    ...typography.meta,
    color: colors.textMuted,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  locationTypeLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  locationTypeText: {
    ...typography.overline,
    color: '#4CAF50',
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  // New Input Section Styles
  locationInputSection: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    backgroundColor: colors.backgroundDark,
  },
  inputRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    alignItems: 'flex-start',
  },
  lineConnector: {
    width: 30,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingVertical: spacing.sm,
  },
  dotTop: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
    marginBottom: spacing.xs - 2,
  },
  lineBetween: {
    width: 2,
    height: spacing.lg + spacing.md,
    backgroundColor: colors.borderDark,
    marginVertical: spacing.xs - 2,
  },
  dotBottom: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.borderDark,
    marginTop: spacing.xs - 2,
  },
  inputFieldWrapper: {
    flex: 1,
  },
  locationInput: {
    ...typography.secondary,
    backgroundColor: colors.surfaceDark,
    color: colors.textPrimary,
    fontSize: 15,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md - 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderDark,
  },
  // Saved Places Section
  savedPlacesSection: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
  },
  savedPlacesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  savedPlacesTitle: {
    ...typography.screenTitle,
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  savedLocationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.surfaceDark,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderDark,
  },
  savedLocationIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: colors.primaryTint,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  savedLocationContent: {
    flex: 1,
  },
  savedLocationName: {
    ...typography.secondary,
    color: colors.textPrimary,
    fontWeight: '700',
    marginBottom: spacing.xxs,
  },
  savedLocationAddress: {
    ...typography.meta,
    color: colors.textMuted,
    fontSize: 13,
    marginBottom: spacing.xxs,
  },
  savedLocationDistance: {
    ...typography.overline,
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  mapLocationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surfaceDark,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderDark,
  },
  mapLocationIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: colors.primaryTint,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  mapLocationText: {
    ...typography.secondary,
    color: colors.primary,
    fontWeight: '700',
    fontSize: 15,
  },
  // Package Info Styles
  packageBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceDark,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderDark,
    gap: spacing.md,
  },
  packageInput: {
    flex: 1,
    ...typography.secondary,
    color: colors.textPrimary,
    paddingVertical: spacing.sm,
  },
  packageSizeBadge: {
    backgroundColor: colors.background,
    paddingVertical: spacing.xs - 2,
    paddingHorizontal: spacing.sm,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.borderDark,
  },
  packageSizeBadgeActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  packageSizeText: {
    ...typography.overline,
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: 11,
  },
  // Partners Section Styles
  partnersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sortTabs: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  sortTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingVertical: spacing.xs - 2,
    paddingHorizontal: spacing.sm,
    borderRadius: 6,
    backgroundColor: 'transparent',
  },
  sortTabActive: {},
  sortTabText: {
    ...typography.overline,
    color: colors.textMuted,
    fontWeight: '700',
    fontSize: 11,
  },
  sortTabTextActive: {
    color: colors.primary,
  },
  // Partner Card Styles
  partnerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceDark,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: colors.borderDark,
  },
  partnerCardSelected: {
    borderColor: colors.primary,
  },
  partnerIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 12,
    backgroundColor: colors.primaryTint,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  partnerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xxs,
  },
  partnerName: {
    ...typography.secondary,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  partnerBadge: {
    backgroundColor: colors.primaryTint,
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.xs,
    borderRadius: 4,
  },
  partnerBadgeText: {
    ...typography.overline,
    color: colors.primary,
    fontWeight: '700',
    fontSize: 9,
  },
  partnerDescription: {
    ...typography.meta,
    color: colors.textMuted,
    marginBottom: spacing.xxs,
  },
  partnerFeature: {
    ...typography.meta,
    color: colors.textSecondary,
  },
  partnerPriceWrap: {
    alignItems: 'flex-end',
    marginRight: spacing.md,
  },
  partnerPrice: {
    ...typography.secondary,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  partnerTime: {
    ...typography.meta,
    color: colors.textMuted,
    marginTop: spacing.xxs,
  },
  partnerRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.textMuted,
  },
  partnerRadioSelected: {
    borderColor: colors.primary,
  },
  partnerRadioInner: {
    flex: 1,
    borderRadius: 8,
    backgroundColor: colors.primary,
    margin: 2,
  },
  // Vehicle Type Styles
  vehicleSubtitle: {
    ...typography.secondary,
    color: colors.textMuted,
    fontSize: 13,
    marginBottom: spacing.md,
  },
  vehicleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceDark,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: colors.borderDark,
  },
  vehicleCardSelected: {
    borderColor: colors.primary,
  },
  vehicleIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 10,
    backgroundColor: colors.primaryTint,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  vehicleName: {
    ...typography.secondary,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xxs,
  },
  vehicleCapacity: {
    ...typography.meta,
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: spacing.xxs,
  },
  vehicleDesc: {
    ...typography.meta,
    color: colors.textSecondary,
    fontSize: 12,
  },
  vehiclePriceWrap: {
    alignItems: 'flex-end',
    marginRight: spacing.md,
  },
  vehiclePrice: {
    ...typography.secondary,
    fontWeight: '700',
    color: colors.textPrimary,
    fontSize: 16,
  },
  vehicleRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.textMuted,
  },
  vehicleRadioSelected: {
    borderColor: colors.primary,
  },
  vehicleRadioInner: {
    flex: 1,
    borderRadius: 8,
    backgroundColor: colors.primary,
    margin: 2,
  },
  // Footer Styles
  footer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    backgroundColor: colors.backgroundDark,
    borderTopWidth: 1,
    borderTopColor: colors.borderDark,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  confirmBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  confirmBtnDisabled: {
    opacity: 0.5,
  },
  confirmBtnText: {
    ...typography.secondary,
    fontWeight: '700',
    color: colors.textPrimary,
    fontSize: 16,
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceDark,
    borderRadius: 12,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderDark,
  },
  secondaryBtnText: {
    ...typography.secondary,
    fontWeight: '700',
    color: colors.primary,
    fontSize: 16,
  },
});
