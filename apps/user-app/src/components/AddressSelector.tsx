/**
 * AddressSelector – unified address selection modal.
 *
 * Used on:  app open · home screen · checkout · profile
 *
 * Reads/writes exclusively through useAddressStore.
 * Shows:  GPS location · Search autocomplete · Saved addresses · Recent addresses
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
  LayoutAnimation,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useThemeColors, useThemedStyles } from '@/theme';
import { spacing } from '@/constants/spacing';
import { useAddressStore } from '@/store/address.store';
import { locationApi, type LocationSuggestion } from '@/api/location.api';
import { showToast } from '@/lib/toast';
import type { Address } from '@/types/address';
import { colors } from '@/constants/colors';

/* ─── Props ──────────────────────────────────────── */

interface AddressSelectorProps {
  visible: boolean;
  onClose: () => void;
}

/* ─── Component ──────────────────────────────────── */

export const AddressSelector: React.FC<AddressSelectorProps> = ({ visible, onClose }) => {
  const colors = useThemeColors();
  const styles = useThemedStyles(createStyles);

  // Global store
  const selectedAddress = useAddressStore((s) => s.selectedAddress);
  const savedAddresses = useAddressStore((s) => s.savedAddresses);
  const recentAddresses = useAddressStore((s) => s.recentAddresses);
  const loading = useAddressStore((s) => s.loading);
  const selectAddress = useAddressStore((s) => s.selectAddress);
  const fetchCurrentLocation = useAddressStore((s) => s.fetchCurrentLocation);
  const loadSavedAddresses = useAddressStore((s) => s.loadSavedAddresses);
  const saveAddress = useAddressStore((s) => s.saveAddress);

  // Local UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [saveFormData, setSaveFormData] = useState({
    houseNo: '',
    floor: '',
    landmark: '',
    label: 'Home' as string,
  });
  const [isSaving, setIsSaving] = useState(false);

  // Pending address to save (from GPS or search, before the form)
  const [pendingAddress, setPendingAddress] = useState<{ lat: number; lng: number; fullAddress: string } | null>(null);

  // Load saved addresses on open
  useEffect(() => {
    if (visible) {
      loadSavedAddresses();
      setSearchQuery('');
      setSuggestions([]);
      setShowSaveForm(false);
      setPendingAddress(null);
    }
  }, [visible, loadSavedAddresses]);

  // Debounced search
  useEffect(() => {
    if (searchQuery.length < 3) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const results = await locationApi.getAutocomplete(searchQuery);
        console.log("here", searchQuery, results)

        setSuggestions(results);
      } catch {
        setSuggestions([]);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  /* ── Handlers ──────────────────────────────────── */

  const handleUseCurrentLocation = useCallback(async () => {
    const addr = await fetchCurrentLocation();
    if (addr) {
      onClose();
    } else {
      showToast({ type: 'error', message: 'Could not get your location. Please search manually.' });
    }
  }, [fetchCurrentLocation, onClose]);

  const handleSelectSuggestion = useCallback(
    async (suggestion: LocationSuggestion) => {
      setIsSearching(true);
      setSuggestions([]);
      setSearchQuery(suggestion.description);
      try {
        const results = await Location.geocodeAsync(suggestion.description);
        if (results.length > 0) {
          const { latitude, longitude } = results[0];

          // Reverse geocode for a cleaner address
          let fullAddress = suggestion.description;
          try {
            const [geo] = await Location.reverseGeocodeAsync({ latitude, longitude });
            if (geo) {
              fullAddress =
                [geo.streetNumber, geo.street, geo.district, geo.city]
                  .filter(Boolean)
                  .join(', ') || fullAddress;
            }
          } catch {
            // keep suggestion.description
          }

          const addr: Address = {
            id: `search-${Date.now()}`,
            label: suggestion.mainText || 'Search Result',
            fullAddress,
            lat: latitude,
            lng: longitude,
          };
          selectAddress(addr);
          onClose();
        } else {
          showToast({ type: 'error', message: 'No results found for this location' });
        }
      } catch {
        showToast({ type: 'error', message: 'Search failed. Please try again.' });
      } finally {
        setIsSearching(false);
      }
    },
    [selectAddress, onClose]
  );

  const handleSelectSaved = useCallback(
    (addr: Address) => {
      selectAddress(addr);
      onClose();
    },
    [selectAddress, onClose]
  );

  const handleOpenSaveForm = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowSaveForm((v) => !v);
  }, []);

  const handleSaveNewAddress = useCallback(async () => {
    if (!saveFormData.houseNo || !saveFormData.label) {
      showToast({ type: 'error', message: 'Please fill house/flat number and label' });
      return;
    }

    // Need coords — either from pending or selected or GPS
    let lat = pendingAddress?.lat ?? selectedAddress?.lat;
    let lng = pendingAddress?.lng ?? selectedAddress?.lng;

    if (lat == null || lng == null) {
      showToast({ type: 'error', message: 'Location coordinates missing. Use GPS first.' });
      return;
    }

    const fullAddr = [
      saveFormData.houseNo,
      saveFormData.floor ? `Floor ${saveFormData.floor}` : '',
      saveFormData.landmark ? `Near ${saveFormData.landmark}` : '',
      pendingAddress?.fullAddress || selectedAddress?.fullAddress || '',
    ]
      .filter(Boolean)
      .join(', ');

    setIsSaving(true);
    const saved = await saveAddress({
      label: saveFormData.label,
      fullAddress: fullAddr,
      lat,
      lng,
      landmark: saveFormData.landmark || undefined,
    });

    setIsSaving(false);

    if (saved) {
      showToast({ type: 'success', message: 'Address saved!' });
      onClose();
    } else {
      showToast({ type: 'error', message: 'Failed to save address' });
    }
  }, [saveFormData, pendingAddress, selectedAddress, saveAddress, onClose]);

  /* ── Render ────────────────────────────────────── */

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.black }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* ── Header ─────────────────────────────── */}
        <View style={[styles.header, { backgroundColor: colors.black }]}>
          <TouchableOpacity onPress={onClose} style={styles.headerBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <MaterialIcons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Select Address</Text>
          <View style={styles.headerBtn} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Search ───────────────────────────── */}
          <View style={styles.searchSection}>
            <View style={[styles.searchContainer, { backgroundColor: colors.surfaceLight || colors.surface }]}>
              <MaterialIcons name="search" size={20} color={colors.textMuted} />
              <TextInput
                style={[styles.searchInput, { color: colors.textDark }]}
                placeholder="Search for area, street name..."
                placeholderTextColor={colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => { setSearchQuery(''); setSuggestions([]); }}>
                  <MaterialIcons name="close" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {/* Search suggestions */}
            {suggestions.length > 0 && (
              <View style={[styles.suggestionsList, { backgroundColor: colors.black }]}>
                {suggestions.map((s) => (
                  <TouchableOpacity
                    key={s.placeId}
                    style={[styles.suggestionItem, { borderBottomColor: colors.border }]}
                    onPress={() => handleSelectSuggestion(s)}
                  >
                    <MaterialIcons name="location-on" size={18} color={colors.textMuted} />
                    <View style={styles.suggestionText}>
                      <Text style={[styles.suggestionMain, { color: colors.textPrimary }]}>{s.mainText}</Text>
                      <Text style={[styles.suggestionSecondary, { color: colors.textMuted }]} numberOfLines={1}>
                        {s.secondaryText}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {isSearching && <ActivityIndicator size="small" color={colors.primary} style={{ marginBottom: 16 }} />}

          {/* ── GPS Button ───────────────────────── */}
          <TouchableOpacity
            style={[styles.gpsButton, { backgroundColor: colors.primary }]}
            onPress={handleUseCurrentLocation}
            activeOpacity={0.9}
          >
            <View style={styles.gpsIconRow}>
              <View style={styles.gpsIconCircle}>
                {loading ? (
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

          {/* ── Saved Addresses ──────────────────── */}
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Saved Addresses</Text>
            <View style={[styles.sectionDot, { backgroundColor: colors.primary }]} />
          </View>

          <View style={styles.bentoGrid}>
            {savedAddresses.length > 0 ? (
              savedAddresses.map((addr) => {
                const isActive = selectedAddress?.id === addr.id;
                return (
                  <TouchableOpacity
                    key={addr.id}
                    style={[
                      styles.bentoCard,
                      { backgroundColor: colors.background },
                      isActive && { borderColor: colors.primary, borderWidth: 2 },
                    ]}
                    onPress={() => handleSelectSaved(addr)}
                  >
                    <View
                      style={[
                        styles.bentoIconWrap,
                        {
                          backgroundColor:
                            addr.label.toLowerCase() === 'work'
                              ? (colors.primaryLight || colors.primary) + '30'
                              : colors.orange + '20',
                        },
                      ]}
                    >
                      <MaterialIcons
                        name={addr.label.toLowerCase() === 'work' ? 'work' : addr.label.toLowerCase() === 'other' ? 'place' : 'home'}
                        size={20}
                        color={addr.label.toLowerCase() === 'work' ? colors.primary : colors.orange}
                      />
                    </View>
                    <Text style={[styles.bentoLabel, { color: colors.textPrimary }]}>{addr.label}</Text>
                    <Text style={[styles.bentoAddress, { color: colors.textMuted }]} numberOfLines={1}>
                      {addr.fullAddress}
                    </Text>
                    {isActive && (
                      <View style={[styles.activeBadge, { backgroundColor: colors.primary }]}>
                        <MaterialIcons name="check" size={12} color="#fff" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })
            ) : (
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>No saved addresses yet</Text>
            )}
          </View>

          {/* ── Recent Addresses ─────────────────── */}
          {recentAddresses.length > 0 && (
            <>
              <View style={styles.sectionHeaderRow}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Recent</Text>
                <View style={[styles.sectionDot, { backgroundColor: colors.primary }]} />
              </View>

              {recentAddresses.map((addr) => (
                <TouchableOpacity
                  key={addr.id}
                  style={[styles.recentItem, { backgroundColor: colors.background, borderColor: colors.border }]}
                  onPress={() => handleSelectSaved(addr)}
                >
                  <MaterialIcons name="history" size={20} color={colors.textMuted} />
                  <View style={styles.recentText}>
                    <Text style={[styles.recentLabel, { color: colors.textPrimary }]}>{addr.label}</Text>
                    <Text style={[styles.recentAddress, { color: colors.textMuted }]} numberOfLines={1}>
                      {addr.fullAddress}
                    </Text>
                  </View>
                  {selectedAddress?.id === addr.id && (
                    <MaterialIcons name="check-circle" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </>
          )}

          {/* ── Save New Address Accordion ────────── */}
          <View style={styles.manualEntrySection}>
            <TouchableOpacity style={styles.manualEntryHeader} onPress={handleOpenSaveForm} activeOpacity={0.7}>
              <View style={styles.manualHeaderLeft}>
                <View style={[styles.manualIconCircle, { backgroundColor: colors.surfaceDark || '#1a1a1a' }]}>
                  <MaterialIcons name="edit-location" size={16} color={colors.primary} />
                </View>
                <Text style={[styles.manualHeaderText, { color: colors.textPrimary }]}>Save a new address</Text>
              </View>
              <MaterialIcons
                name={showSaveForm ? 'expand-less' : 'expand-more'}
                size={24}
                color={colors.textMuted}
              />
            </TouchableOpacity>

            {showSaveForm && (
              <View style={styles.manualForm}>
                <View style={styles.formRow}>
                  <View style={styles.formInputContainer}>
                    <Text style={styles.formLabel}>House / Flat No. *</Text>
                    <TextInput
                      style={[styles.formInput, { color: colors.textPrimary, borderColor: colors.border }]}
                      placeholder="e.g. 402-A"
                      placeholderTextColor={colors.textMuted}
                      value={saveFormData.houseNo}
                      onChangeText={(t) => setSaveFormData((p) => ({ ...p, houseNo: t }))}
                    />
                  </View>
                  <View style={styles.formInputContainer}>
                    <Text style={styles.formLabel}>Floor</Text>
                    <TextInput
                      style={[styles.formInput, { color: colors.textPrimary, borderColor: colors.border }]}
                      placeholder="e.g. 4th"
                      placeholderTextColor={colors.textMuted}
                      value={saveFormData.floor}
                      onChangeText={(t) => setSaveFormData((p) => ({ ...p, floor: t }))}
                    />
                  </View>
                </View>

                <View style={styles.formInputContainerFull}>
                  <Text style={styles.formLabel}>Landmark</Text>
                  <TextInput
                    style={[styles.formInput, { color: colors.textPrimary, borderColor: colors.border }]}
                    placeholder="Near Park"
                    placeholderTextColor={colors.textMuted}
                    value={saveFormData.landmark}
                    onChangeText={(t) => setSaveFormData((p) => ({ ...p, landmark: t }))}
                  />
                </View>

                <View style={styles.formInputContainerFull}>
                  <Text style={styles.formLabel}>Save As *</Text>
                  <View style={styles.labelChips}>
                    {['Home', 'Work', 'Other'].map((l) => (
                      <TouchableOpacity
                        key={l}
                        style={[
                          styles.labelChip,
                          { borderColor: colors.border },
                          saveFormData.label === l && { backgroundColor: colors.primary, borderColor: colors.primary },
                        ]}
                        onPress={() => setSaveFormData((p) => ({ ...p, label: l }))}
                      >
                        <Text
                          style={[
                            styles.labelChipText,
                            { color: colors.textMuted },
                            saveFormData.label === l && { color: '#fff' },
                          ]}
                        >
                          {l}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.saveContinueBtn, { backgroundColor: colors.primary }]}
                  onPress={handleSaveNewAddress}
                >
                  {isSaving ? (
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
      </KeyboardAvoidingView>
    </Modal>
  );
};

/* ─── Styles ────────────────────────────────────── */

const createStyles = () =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 14,
    },
    headerBtn: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '800',
      letterSpacing: -0.5,
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 10,
    },

    /* Search */
    searchSection: {
      marginBottom: 20,
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 12,
      paddingHorizontal: 12,
      height: 52,
      gap: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 5,
      elevation: 2,
    },
    searchInput: {
      flex: 1,
      fontSize: 14,
      fontWeight: '500',
    },
    suggestionsList: {
      marginTop: 4,
      borderRadius: 12,
      paddingVertical: 8,
      maxHeight: 220,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 8,
    },
    suggestionItem: {
      flexDirection: 'row',
      padding: 12,
      borderBottomWidth: 1,
      alignItems: 'center',
    },
    suggestionText: {
      marginLeft: 12,
      flex: 1,
    },
    suggestionMain: {
      fontSize: 14,
      fontWeight: '600',
    },
    suggestionSecondary: {
      fontSize: 12,
      marginTop: 2,
    },

    /* GPS */
    gpsButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderRadius: 16,
      padding: 16,
      marginBottom: 24,
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

    /* Section Headers */
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 14,
      gap: 8,
    },
    sectionTitle: {
      fontSize: 17,
      fontWeight: '800',
    },
    sectionDot: {
      width: 4,
      height: 4,
      borderRadius: 2,
    },

    /* Bento Grid (saved) */
    bentoGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      marginBottom: 24,
    },
    bentoCard: {
      flex: 1,
      minWidth: '45%',
      borderRadius: 20,
      padding: 16,
      borderColor: colors.surface,
      borderWidth: 1,
      shadowColor: colors.surface,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.04,
      shadowRadius: 10,
      elevation: 2,
      position: 'relative',
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
    },
    bentoAddress: {
      fontSize: 11,
      marginTop: 2,
    },
    activeBadge: {
      position: 'absolute',
      top: 10,
      right: 10,
      width: 22,
      height: 22,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
    },

    /* Recent */
    recentItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 14,
      borderRadius: 12,
      marginBottom: 10,
      borderWidth: 1,
    },
    recentText: {
      flex: 1,
      minWidth: 0,
    },
    recentLabel: {
      fontSize: 14,
      fontWeight: '600',
    },
    recentAddress: {
      fontSize: 12,
      marginTop: 2,
    },

    /* Manual Form */
    manualEntrySection: {
      backgroundColor: colors.surfaceDark || '#0a0a0a',
      borderRadius: 16,
      overflow: 'hidden',
      padding: 4,
      borderWidth: 1,
      borderColor: colors.border || '#333',
      marginTop: 8,
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
      alignItems: 'center',
      justifyContent: 'center',
    },
    manualHeaderText: {
      fontSize: 14,
      fontWeight: '700',
    },
    manualForm: {
      padding: 12,
      paddingTop: 4,
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
      backgroundColor: colors.surfaceDark || '#1a1a1a',
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 14,
      fontWeight: '500',
      borderWidth: 1,
    },
    labelChips: {
      flexDirection: 'row',
      gap: 8,
    },
    labelChip: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
    },
    labelChipText: {
      fontSize: 12,
      fontWeight: '600',
    },
    saveContinueBtn: {
      borderRadius: 12,
      height: 52,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 8,
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
      fontStyle: 'italic',
    },
  });
