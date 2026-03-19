import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  ActivityIndicator,
  Platform,
  LayoutAnimation,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { useThemeColors, useThemedStyles } from '@/theme';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { usersApi, UserAddressItem } from '@/api/users.api';
import { useLocationStore } from '@/store/location.store';
import { showToast } from '@/lib/toast';
import { colors } from '@/constants/colors';

interface AddressSelectorProps {
  onSelect: (address: { latitude: number; longitude: number; address: string; label?: string }) => void;
  onClose?: () => void;
  showMap?: boolean;
}

export const AddressSelector: React.FC<AddressSelectorProps> = ({
  onSelect,
  onClose,
  showMap = true,
}) => {
  const colors = useThemeColors();
  const styles = useThemedStyles(createStyles);
  const queryClient = useQueryClient();
  const locationStore = useLocationStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);

  // Manual form state
  const [manualAddress, setManualAddress] = useState({
    houseNo: '',
    floor: '',
    landmark: '',
    label: 'Home', // Default label
  });

  // Fetch saved addresses
  const { data: savedAddresses = [], isLoading: loadingAddresses } = useQuery({
    queryKey: ['user-addresses'],
    queryFn: () => usersApi.getMyAddresses(),
  });

  // Add address mutation
  const addAddressMutation = useMutation({
    mutationFn: (body: any) => usersApi.addAddress(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-addresses'] });
      showToast({ type: 'success', message: 'Address saved successfully' });
    },
    onError: () => {
      showToast({ type: 'error', message: 'Failed to save address' });
    },
  });

  const handleUseCurrentLocation = async () => {
    setIsSearching(true);
    try {
      const coords = await locationStore.fetchLocation();
      if (coords) {
        const [address] = await Location.reverseGeocodeAsync({
          latitude: coords.latitude,
          longitude: coords.longitude,
        });

        const addressLine = address
          ? [address.streetNumber, address.street, address.district, address.city].filter(Boolean).join(', ')
          : `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`;

        const label = address?.city || 'Current Location';

        onSelect({
          latitude: coords.latitude,
          longitude: coords.longitude,
          address: addressLine,
          label: label,
        });
      }
    } catch (error) {
      showToast({ type: 'error', message: 'Could not get your location' });
    } finally {
      setIsSearching(false);
    }
  };

  const handleManualSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const results = await Location.geocodeAsync(searchQuery);
      if (results.length > 0) {
        const { latitude, longitude } = results[0];

        // Reverse geocode to get formal address
        const [address] = await Location.reverseGeocodeAsync({ latitude, longitude });
        const addressLine = address
          ? [address.streetNumber, address.street, address.district, address.city].filter(Boolean).join(', ')
          : searchQuery;

        onSelect({
          latitude,
          longitude,
          address: addressLine,
          label: searchQuery,
        });
      } else {
        showToast({ type: 'error', message: 'No results found' });
      }
    } catch (err) {
      showToast({ type: 'error', message: 'Search failed' });
    } finally {
      setIsSearching(false);
    }
  };

  const handleSaveManualAddress = async () => {
    if (!manualAddress.houseNo || !manualAddress.label) {
      showToast({ type: 'error', message: 'Please fill required fields' });
      return;
    }

    const currentCoords = locationStore.coords;
    if (!currentCoords) {
      showToast({ type: 'error', message: 'Location coords missing. Use GPS first.' });
      return;
    }

    const fullAddressLine = `${manualAddress.houseNo}, ${manualAddress.floor ? manualAddress.floor + ', ' : ''}${manualAddress.landmark ? 'Near ' + manualAddress.landmark : ''}`;

    addAddressMutation.mutate({
      label: manualAddress.label,
      addressLine: fullAddressLine,
      latitude: currentCoords.latitude,
      longitude: currentCoords.longitude,
    }, {
      onSuccess: (newAddr) => {
        onSelect({
          latitude: newAddr.latitude || currentCoords.latitude,
          longitude: newAddr.longitude || currentCoords.longitude,
          address: newAddr.addressLine,
          label: newAddr.label,
        });
      }
    });
  };

  const toggleManualForm = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowManualForm(!showManualForm);
  };

  return (
    <View style={styles.container}>
      {/* Header */}


      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Search Bar */}
        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <MaterialIcons name="search" size={20} color={colors.textMuted} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Neighborhood, street, or city"
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleManualSearch}
            />
          </View>
        </View>

        {/* GPS Button */}
        <TouchableOpacity
          style={styles.gpsButton}
          onPress={handleUseCurrentLocation}
          activeOpacity={0.9}
        >
          <View style={styles.gpsIconRow}>
            <View style={styles.gpsIconCircle}>
              {isSearching ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <MaterialIcons name="my-location" size={20} color="#fff" />
              )}
            </View>
            <View>
              <Text style={styles.gpsTitle}>Use Current Location</Text>
              <Text style={styles.gpsSubtitle}>Using GPS to find you</Text>
            </View>
          </View>
          <MaterialIcons name="chevron-right" size={24} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>

        {/* Map Preview Placeholder */}
        {showMap && (
          <View style={styles.mapContainer}>
            <Image
              source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCx89WjaKyVaaBc9pQkfvVr4jOAz0mwtJUNdT0UtRjrOeaDZasAgkYumD3GyFH6Y3Xzs5B0Q90ovUEXIKdFyTgVY0Aqg-1FaIOQDDrgcqximok-UpElUpycVMBy-AuLg0dKDkgz5alxuDqzAz-NEEivUdJKn59Kpq9McZ_XOZWZftab4GS5L028qvR5220vN5btkmz8taeDtXPa18HhnmJoyiy--hADmWzR2FNZIQAh_K7TuYl-LpD3HUmhrnRtHWHeRU6kP2Re4Nxa' }}
              style={styles.mapImage}
            />
            <View style={styles.mapPin}>
              <View style={styles.pinCircle}>
                <MaterialIcons name="home" size={18} color="#fff" />
              </View>
              <View style={styles.pinShadow} />
            </View>
          </View>
        )}

        {/* Saved Locations */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Saved Locations</Text>
          <View style={styles.sectionDot} />
        </View>

        <View style={styles.bentoGrid}>
          {loadingAddresses ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : savedAddresses.length > 0 ? (
            savedAddresses.map((addr) => (
              <TouchableOpacity
                key={addr.id}
                style={styles.bentoCard}
                onPress={() => onSelect({
                  latitude: addr.latitude || 0,
                  longitude: addr.longitude || 0,
                  address: addr.addressLine,
                  label: addr.label,
                })}
              >
                <View style={[
                  styles.bentoIconWrap,
                  { backgroundColor: addr.label.toLowerCase() === 'work' ? colors.primaryLight : colors.orange + '20' }
                ]}>
                  <MaterialIcons
                    name={addr.label.toLowerCase() === 'work' ? 'work' : 'home'}
                    size={20}
                    color={addr.label.toLowerCase() === 'work' ? colors.primary : colors.orange}
                  />
                </View>
                <Text style={styles.bentoLabel}>{addr.label}</Text>
                <Text style={styles.bentoAddress} numberOfLines={1}>{addr.addressLine}</Text>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.emptyText}>No saved addresses yet</Text>
          )}
        </View>

        {/* Manual Address Accordion */}
        <View style={styles.manualEntrySection}>
          <TouchableOpacity
            style={styles.manualEntryHeader}
            onPress={toggleManualForm}
            activeOpacity={0.7}
          >
            <View style={styles.manualHeaderLeft}>
              <View style={styles.manualIconCircle}>
                <MaterialIcons name="edit-location" size={16} color={colors.primary} />
              </View>
              <Text style={styles.manualHeaderText}>Enter address manually</Text>
            </View>
            <MaterialIcons
              name={showManualForm ? "expand-less" : "expand-more"}
              size={24}
              color={colors.textMuted}
            />
          </TouchableOpacity>

          {showManualForm && (
            <View style={styles.manualForm}>
              <View style={styles.formRow}>
                <View style={styles.formInputContainer}>
                  <Text style={styles.formLabel}>House/Flat No.</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="e.g. 402-A"
                    placeholderTextColor={colors.textMuted}
                    value={manualAddress.houseNo}
                    onChangeText={(text) => setManualAddress(prev => ({ ...prev, houseNo: text }))}
                  />
                </View>
                <View style={styles.formInputContainer}>
                  <Text style={styles.formLabel}>Floor</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="e.g. 4th Floor"
                    placeholderTextColor={colors.textMuted}
                    value={manualAddress.floor}
                    onChangeText={(text) => setManualAddress(prev => ({ ...prev, floor: text }))}
                  />
                </View>
              </View>

              <View style={styles.formInputContainerFull}>
                <Text style={styles.formLabel}>Landmark</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Near Public Park"
                  placeholderTextColor={colors.textMuted}
                  value={manualAddress.landmark}
                  onChangeText={(text) => setManualAddress(prev => ({ ...prev, landmark: text }))}
                />
              </View>

              <View style={styles.formInputContainerFull}>
                <Text style={styles.formLabel}>Save As (Label)</Text>
                <View style={styles.labelChips}>
                  {['Home', 'Work', 'Other'].map(l => (
                    <TouchableOpacity
                      key={l}
                      style={[styles.labelChip, manualAddress.label === l && styles.labelChipActive]}
                      onPress={() => setManualAddress(prev => ({ ...prev, label: l }))}
                    >
                      <Text style={[styles.labelChipText, manualAddress.label === l && styles.labelChipTextActive]}>{l}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity
                style={styles.saveContinueBtn}
                onPress={handleSaveManualAddress}
              >
                {addAddressMutation.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveContinueBtnText}>Save & Continue</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const createStyles = () => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: colors.surface,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    color: colors.primary,
    letterSpacing: -0.5,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  searchSection: {
    marginBottom: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 52,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.textDark,
    fontWeight: '500',
  },
  gpsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 8,
  },
  gpsIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  gpsIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gpsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  gpsSubtitle: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 1,
  },
  mapContainer: {
    height: 200,
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 30,
    backgroundColor: colors.surfaceDark,
  },
  mapImage: {
    width: '100%',
    height: '100%',
    opacity: 0.8,
  },
  mapPin: {
    position: 'absolute',
    top: '40%',
    left: '48%',
    alignItems: 'center',
  },
  pinCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  pinShadow: {
    width: 8,
    height: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.2)',
    marginTop: 4,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  sectionDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  bentoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  bentoCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    shadowColor: '#2d3434',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  bentoIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  bentoLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  bentoAddress: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  manualEntrySection: {
    backgroundColor: '#000000',
    borderRadius: 16,
    overflow: 'hidden',
    padding: 4,
    borderWidth: 1,
    borderColor: '#333333',
  },
  manualEntryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  manualHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  manualIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  manualHeaderText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  manualForm: {
    padding: 12,
    paddingTop: 4,
    backgroundColor: '#000000',
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  formInputContainer: {
    flex: 1,
  },
  formInputContainerFull: {
    width: '100%',
    marginBottom: 12,
  },
  formLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#999999',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginLeft: 4,
  },
  formInput: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '500',
    borderWidth: 1,
    borderColor: '#333333',
  },
  labelChips: {
    flexDirection: 'row',
    gap: 8,
  },
  labelChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333333',
  },
  labelChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  labelChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999999',
  },
  labelChipTextActive: {
    color: '#ffffff',
  },
  saveContinueBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  saveContinueBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 12,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
});
