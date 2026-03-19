import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Animated,
  Dimensions,
  Platform,
  LayoutAnimation,
} from 'react-native';
import { useRouter } from 'expo-router';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useThemeColors, useThemedStyles } from '@/theme';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { radius } from '@/constants/radius';
import { useLocationStore } from '@/store/location.store';
import { locationApi, LocationSuggestion } from '@/api/location.api';
import { usersApi } from '@/api/users.api';
import { showToast } from '@/lib/toast';

const { width, height } = Dimensions.get('window');

/**
 * Advanced Address Selection Screen
 * - Major Quick Commerce Style
 * - Map Integration
 * - Search Suggestions
 * - Multi-Step (Location -> Details Form)
 */
const LocationSelectorScreen = () => {
  const colors = useThemeColors();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const locationStore = useLocationStore();

  // State
  const [step, setStep] = useState<'pick' | 'details'>('pick');
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [region, setRegion] = useState({
    latitude: locationStore.coords?.latitude || 28.6139,
    longitude: locationStore.coords?.longitude || 77.2090,
    latitudeDelta: 0.005,
    longitudeDelta: 0.005,
  });
  const [preciseAddress, setPreciseAddress] = useState(locationStore.coords?.label || 'Locating...');
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);

  // Form Details State
  const [formData, setFormData] = useState({
    houseNo: '',
    street: '',
    landmark: '',
    name: '',
    mobile: '',
    label: 'Home' as 'Home' | 'Work' | 'Other',
  });

  // Search logic
  const fetchSuggestions = async (q: string) => {
    if (q.length < 3) {
      setSuggestions([]);
      return;
    }
    try {
      const results = await locationApi.getAutocomplete(q);
      setSuggestions(results);
    } catch (e) {
      console.warn('Autocomplete fetch failed', e);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSuggestions(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Handle region change (pin on map)
  const handleRegionChangeComplete = async (newRegion: any) => {
    setRegion(newRegion);
    setIsReverseGeocoding(true);
    try {
      const [addr] = await Location.reverseGeocodeAsync({
        latitude: newRegion.latitude,
        longitude: newRegion.longitude,
      });
      if (addr) {
        const full = [addr.streetNumber, addr.street, addr.district, addr.city].filter(Boolean).join(', ');
        setPreciseAddress(full || 'Unnamed Road');
      }
    } catch (e) {
      setPreciseAddress(`${newRegion.latitude.toFixed(4)}, ${newRegion.longitude.toFixed(4)}`);
    } finally {
      setIsReverseGeocoding(false);
    }
  };

  const onSelectSuggestion = async (suggestion: LocationSuggestion) => {
    setSearchQuery(suggestion.description);
    setSuggestions([]);
    try {
      const results = await Location.geocodeAsync(suggestion.description);
      if (results.length > 0) {
        const { latitude, longitude } = results[0];
        setRegion({
          ...region,
          latitude,
          longitude,
        });
        setPreciseAddress(suggestion.description);
      }
    } catch (e) {
      showToast({ type: 'error', message: 'Failed to find selected location' });
    }
  };

  const handleConfirmLocation = () => {
    setStep('details');
  };

  const handleSaveAddress = async () => {
    if (!formData.houseNo || !formData.name || !formData.mobile) {
      showToast({ type: 'error', message: 'Please fill all required fields' });
      return;
    }

    const fullAddressLine = `${formData.houseNo}, ${formData.street}${formData.landmark ? ', Near ' + formData.landmark : ''}`;
    
    try {
      await usersApi.addAddress({
        label: formData.label,
        addressLine: fullAddressLine,
        latitude: region.latitude,
        longitude: region.longitude,
        receiverPhone: formData.mobile,
        receiverName: formData.name,
      });

      // Update store
      locationStore.setCoords({
        latitude: region.latitude,
        longitude: region.longitude,
        label: fullAddressLine,
      });

      showToast({ type: 'success', message: 'Address saved!' });
      queryClient.invalidateQueries({ queryKey: ['user-addresses'] });
      router.replace('/(tabs)/home');
    } catch (e) {
      showToast({ type: 'error', message: 'Failed to save address' });
    }
  };

  return (
    <View style={styles.container}>
      {/* Map View */}
      <View style={styles.mapWrapper}>
        <MapView
          style={styles.map}
          region={region}
          onRegionChangeComplete={handleRegionChangeComplete}
        />
        {/* Fixed Pin in center */}
        <View style={styles.centerPinContainer} pointerEvents="none">
          <View style={styles.pinBubble}>
            {isReverseGeocoding ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={styles.pinBubbleText} numberOfLines={1}>Set your location</Text>
            )}
          </View>
          <View style={styles.pinShadow} />
          <MaterialIcons name="location-on" size={44} color={colors.primary} style={styles.pinIcon} />
        </View>

        {/* Top Floating UI */}
        <View style={[styles.floatingHeader, { paddingTop: insets.top + spacing.sm }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.circleBtn}>
            <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.searchBarWrapper}>
            <View style={styles.searchBar}>
              <MaterialIcons name="search" size={20} color={colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search for area, street name..."
                placeholderTextColor={colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <MaterialIcons name="close" size={20} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
            {suggestions.length > 0 && (
              <View style={styles.suggestionsList}>
                {suggestions.map((s) => (
                  <TouchableOpacity 
                    key={s.placeId} 
                    style={styles.suggestionItem}
                    onPress={() => onSelectSuggestion(s)}
                  >
                    <MaterialIcons name="location-on" size={18} color={colors.textMuted} />
                    <View style={styles.suggestionText}>
                      <Text style={styles.suggestionMain}>{s.mainText}</Text>
                      <Text style={styles.suggestionSecondary} numberOfLines={1}>{s.secondaryText}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Current Location FAB */}
        <TouchableOpacity 
          style={[styles.gpsFab, { bottom: step === 'pick' ? 240 : 20 }]}
          onPress={async () => {
            const coords = await locationStore.fetchLocation();
            if (coords) {
              setRegion({ ...region, latitude: coords.latitude, longitude: coords.longitude });
            }
          }}
        >
          <MaterialIcons name="my-location" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Bottom Sheets (pick vs details) */}
      {step === 'pick' ? (
        <View style={styles.bottomSheet}>
          <View style={styles.sheetHeader}>
            <View style={styles.handler} />
            <Text style={styles.sheetTitle}>Select Delivery Location</Text>
          </View>
          <View style={styles.addressDisplayRow}>
            <View style={styles.addressIconWrap}>
              <MaterialIcons name="location-on" size={24} color={colors.primary} />
            </View>
            <View style={styles.addressInfo}>
              <Text style={styles.addressLabel}>Current Location</Text>
              <Text style={styles.addressText} numberOfLines={2}>
                {preciseAddress}
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirmLocation}>
            <Text style={styles.confirmBtnText}>Confirm Location</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Animated.View style={styles.detailsModal}>
          <ScrollView 
            contentContainerStyle={styles.detailsContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.detailsHeader}>
              <TouchableOpacity onPress={() => setStep('pick')} style={styles.detailsBack}>
                <MaterialIcons name="arrow-back" size={20} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.detailsTitle}>Enter Address Details</Text>
            </View>

            <View style={styles.blackForm}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>House / Flat No.</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. A-123"
                  placeholderTextColor="#666"
                  value={formData.houseNo}
                  onChangeText={t => setFormData({...formData, houseNo: t})}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Apartment / Road / Street</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Sunshine Apartments"
                  placeholderTextColor="#666"
                  value={formData.street}
                  onChangeText={t => setFormData({...formData, street: t})}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Landmark (Optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Near Market"
                  placeholderTextColor="#666"
                  value={formData.landmark}
                  onChangeText={t => setFormData({...formData, landmark: t})}
                />
              </View>

              <View style={styles.divider} />

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Receiver's Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Full Name"
                  placeholderTextColor="#666"
                  value={formData.name}
                  onChangeText={t => setFormData({...formData, name: t})}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Mobile Number</Text>
                <TextInput
                  style={styles.input}
                  placeholder="10-digit number"
                  placeholderTextColor="#666"
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={formData.mobile}
                  onChangeText={t => setFormData({...formData, mobile: t})}
                />
              </View>

              <View style={styles.labelWrapper}>
                <Text style={styles.label}>Save As</Text>
                <View style={styles.chips}>
                  {['Home', 'Work', 'Other'].map(l => (
                    <TouchableOpacity 
                      key={l}
                      style={[styles.chip, formData.label === l && styles.chipActive]}
                      onPress={() => setFormData({...formData, label: l as any})}
                    >
                      <MaterialIcons 
                        name={l === 'Home' ? 'home' : l === 'Work' ? 'work' : 'place'} 
                        size={16} 
                        color={formData.label === l ? '#fff' : '#888'} 
                      />
                      <Text style={[styles.chipText, formData.label === l && styles.chipTextActive]}>{l}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveAddress}>
                <Text style={styles.saveBtnText}>Save Address & Continue</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </Animated.View>
      )}
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  mapWrapper: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  floatingHeader: {
    position: 'absolute',
    top: 0,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  circleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
  },
  searchBarWrapper: {
    flex: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#000',
  },
  suggestionsList: {
    backgroundColor: '#fff',
    marginTop: 4,
    borderRadius: 12,
    paddingVertical: 8,
    maxHeight: 200,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 8,
  },
  suggestionItem: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    alignItems: 'center',
  },
  suggestionText: {
    marginLeft: 12,
    flex: 1,
  },
  suggestionMain: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  suggestionSecondary: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  centerPinContainer: {
    position: 'absolute',
    top: '40%',
    left: '50%',
    marginLeft: -22,
    marginTop: -44,
    alignItems: 'center',
  },
  pinBubble: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
  },
  pinBubbleText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  pinIcon: {
    marginTop: -2,
  },
  pinShadow: {
    position: 'absolute',
    bottom: 0,
    width: 8,
    height: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  gpsFab: {
    position: 'absolute',
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 10,
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 20,
  },
  sheetHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  handler: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e0e0e0',
    marginBottom: 12,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#000',
    letterSpacing: -0.5,
  },
  addressDisplayRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  addressIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressInfo: {
    marginLeft: 12,
    flex: 1,
  },
  addressLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#11bb81',
    marginBottom: 4,
  },
  addressText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
    lineHeight: 20,
  },
  confirmBtn: {
    backgroundColor: colors.primary,
    height: 54,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  detailsModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
  },
  detailsContent: {
    padding: 20,
    paddingTop: 60,
  },
  detailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  detailsBack: {
    padding: 4,
  },
  detailsTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    marginLeft: 12,
  },
  blackForm: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    height: 54,
    paddingHorizontal: 16,
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#222',
    marginVertical: 10,
  },
  labelWrapper: {
    gap: 12,
  },
  chips: {
    flexDirection: 'row',
    gap: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#333',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#fff',
  },
  saveBtn: {
    backgroundColor: colors.primary,
    height: 60,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
});

export default LocationSelectorScreen;
