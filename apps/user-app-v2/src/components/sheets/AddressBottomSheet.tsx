import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  useCallback,
  useEffect,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import BottomSheet, {
  BottomSheetView,
  BottomSheetTextInput,
  BottomSheetScrollView,
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { useColors, useTheme } from '@/theme';
import { spacing, radius } from '@/theme/spacing';
import { fontSize, fontWeight } from '@/theme/typography';
import { useAddressStore, type SelectedAddress } from '@/stores/addressStore';
import { useAddresses } from '@/api/hooks/useAddresses';
import { useAutocomplete } from '@/api/hooks/useSearch';
import { showToast } from '@/stores/toastStore';
import type { AutocompleteResult } from '@/api/types';

// RN polyfills navigator.geolocation — access via globalThis to avoid TS error
interface GeoCoords { latitude: number; longitude: number }
interface GeoAPI {
  getCurrentPosition(
    ok: (p: { coords: GeoCoords }) => void,
    err: () => void,
    opts?: { timeout?: number; enableHighAccuracy?: boolean },
  ): void;
}
const rnGeo = (
  globalThis as unknown as { navigator?: { geolocation?: GeoAPI } }
).navigator?.geolocation;

export interface AddressBottomSheetRef {
  open: () => void;
  close: () => void;
}

interface Props {
  onAddressSelected?: (address: SelectedAddress) => void;
}

export const AddressBottomSheet = forwardRef<AddressBottomSheetRef, Props>(
  ({ onAddressSelected }, ref) => {
    const colors = useColors();
    const { theme } = useTheme();
    const isDark = theme.resolvedMode === 'dark';

    const sheetRef = useRef<BottomSheet>(null);
    const snapPoints = ['92%'];

    const setAddress = useAddressStore((s) => s.setAddress);
    const recentAddresses = useAddressStore((s) => s.recentAddresses);
    const { data: savedAddresses } = useAddresses();

    const [query, setQuery] = useState('');
    const [gpsLoading, setGpsLoading] = useState(false);
    const { data: autocompleteResults, isFetching: isSearching } =
      useAutocomplete(query);

    useImperativeHandle(ref, () => ({
      open: () => sheetRef.current?.expand(),
      close: () => sheetRef.current?.close(),
    }));

    useEffect(() => {
      return () => setQuery('');
    }, []);

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.45}
        />
      ),
      [],
    );

    async function handleSelectAddress(address: SelectedAddress) {
      await setAddress(address);
      sheetRef.current?.close();
      setQuery('');
      onAddressSelected?.(address);
    }

    async function handleAutocompleteSelect(result: AutocompleteResult) {
      // Use description as full address, placeId for dedup
      const addr: SelectedAddress = {
        lat: 0,
        lng: 0,
        label: result.mainText,
        fullAddress: result.description,
        placeId: result.placeId,
      };
      await handleSelectAddress(addr);
    }

    function handleUseCurrentLocation() {
      if (!rnGeo) {
        showToast({
          type: 'error',
          message: 'Location services not available on this device.',
        });
        return;
      }
      setGpsLoading(true);
      rnGeo.getCurrentPosition(
        async (pos) => {
          setGpsLoading(false);
          const addr: SelectedAddress = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            label: 'Current location',
            fullAddress: `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`,
          };
          await handleSelectAddress(addr);
        },
        () => {
          setGpsLoading(false);
          showToast({
            type: 'error',
            message: 'Could not fetch location. Please search for your address.',
          });
        },
        { timeout: 10_000, enableHighAccuracy: false },
      );
    }

    const showAutocomplete = query.trim().length >= 2 && autocompleteResults;
    const showSaved = !showAutocomplete && savedAddresses && savedAddresses.length > 0;
    const showRecent = !showAutocomplete && recentAddresses.length > 0;

    return (
      <BottomSheet
        ref={sheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={{ backgroundColor: colors.text3 }}
        backgroundStyle={{
          backgroundColor: isDark ? colors.surface : colors.bgElevated,
        }}
        keyboardBehavior="fillParent"
        keyboardBlurBehavior="restore"
      >
        <BottomSheetView style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>
            Set delivery location
          </Text>
        </BottomSheetView>

        {/* Search input */}
        <BottomSheetView
          style={[
            styles.searchWrap,
            { backgroundColor: colors.surface2, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.searchIcon, { color: colors.text3 }]}>🔍</Text>
          <BottomSheetTextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search for area, street…"
            placeholderTextColor={colors.text3}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <Text style={[styles.clearBtn, { color: colors.text3 }]}>✕</Text>
            </Pressable>
          )}
          {isSearching && (
            <ActivityIndicator size="small" color={colors.primary} />
          )}
        </BottomSheetView>

        <BottomSheetScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Use current location */}
          <Pressable
            style={[styles.locationRow, { borderBottomColor: colors.borderFaint }]}
            onPress={handleUseCurrentLocation}
            disabled={gpsLoading}
          >
            <View style={[styles.locationIcon, { backgroundColor: colors.primarySoft }]}>
              <Text style={{ fontSize: 18 }}>📍</Text>
            </View>
            <View style={styles.locationText}>
              <Text style={[styles.locationTitle, { color: colors.primary }]}>
                Use current location
              </Text>
              <Text style={[styles.locationSub, { color: colors.text3 }]}>
                Using GPS
              </Text>
            </View>
            {gpsLoading && <ActivityIndicator size="small" color={colors.primary} />}
          </Pressable>

          {/* Autocomplete results */}
          {showAutocomplete && (
            <Section title="Results" colors={colors}>
              {autocompleteResults.map((result) => (
                <AddressRow
                  key={result.placeId}
                  title={result.mainText}
                  subtitle={result.secondaryText}
                  icon="🔍"
                  colors={colors}
                  onPress={() => handleAutocompleteSelect(result)}
                />
              ))}
            </Section>
          )}

          {/* Saved addresses */}
          {showSaved && (
            <Section title="Saved addresses" colors={colors}>
              {savedAddresses!.map((addr) => {
                const addrIcon = addr.label === 'HOME' ? '🏠' : addr.label === 'WORK' ? '💼' : '📌';
                const addrTitle = addr.label === 'HOME' ? 'Home' : addr.label === 'WORK' ? 'Work' : 'Other';
                return (
                <AddressRow
                  key={addr.id}
                  title={addrTitle}
                  subtitle={addr.line1 + (addr.city ? `, ${addr.city}` : '')}
                  icon={addrIcon}
                  colors={colors}
                  onPress={() =>
                    handleSelectAddress({
                      lat: addr.lat,
                      lng: addr.lng,
                      label: addr.label,
                      fullAddress: addr.line1 + (addr.city ? `, ${addr.city}` : ''),
                    })
                  }
                />
                );
              })}
            </Section>
          )}

          {/* Recent addresses */}
          {showRecent && (
            <Section title="Recent" colors={colors}>
              {recentAddresses.map((addr, i) => (
                <AddressRow
                  key={addr.placeId ?? i}
                  title={addr.label}
                  subtitle={addr.fullAddress}
                  icon="🕐"
                  colors={colors}
                  onPress={() => handleSelectAddress(addr)}
                />
              ))}
            </Section>
          )}

          {/* Empty state when no query and no addresses */}
          {!showAutocomplete && !showSaved && !showRecent && (
            <View style={styles.emptyHint}>
              <Text style={[styles.emptyHintText, { color: colors.text3 }]}>
                Search for your area or street name to get started
              </Text>
            </View>
          )}
        </BottomSheetScrollView>
      </BottomSheet>
    );
  },
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface SectionProps {
  title: string;
  children: React.ReactNode;
  colors: ReturnType<typeof useColors>;
}
function Section({ title, children, colors }: SectionProps) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.text3 }]}>{title}</Text>
      {children}
    </View>
  );
}

interface AddressRowProps {
  title: string;
  subtitle: string;
  icon: string;
  colors: ReturnType<typeof useColors>;
  onPress: () => void;
}
function AddressRow({ title, subtitle, icon, colors, onPress }: AddressRowProps) {
  return (
    <Pressable
      style={[styles.addrRow, { borderBottomColor: colors.borderFaint }]}
      onPress={onPress}
    >
      <View style={[styles.addrIcon, { backgroundColor: colors.surface2 }]}>
        <Text style={{ fontSize: 16 }}>{icon}</Text>
      </View>
      <View style={styles.addrText}>
        <Text style={[styles.addrTitle, { color: colors.text }]} numberOfLines={1}>
          {title}
        </Text>
        <Text style={[styles.addrSub, { color: colors.text2 }]} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.titleLg,
    fontWeight: fontWeight.bold,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    height: 48,
  },
  searchIcon: { fontSize: 16 },
  searchInput: {
    flex: 1,
    fontSize: fontSize.body,
    paddingVertical: 0,
  },
  clearBtn: { fontSize: 14, fontWeight: fontWeight.bold },
  scrollContent: { paddingBottom: 40 },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    gap: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  locationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationText: { flex: 1 },
  locationTitle: { fontSize: fontSize.body, fontWeight: fontWeight.semibold },
  locationSub: { fontSize: fontSize.caption, marginTop: 2 },
  section: { paddingTop: spacing.lg },
  sectionTitle: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.semibold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.xs,
  },
  addrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    gap: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  addrIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addrText: { flex: 1 },
  addrTitle: { fontSize: fontSize.body, fontWeight: fontWeight.medium },
  addrSub: { fontSize: fontSize.caption, marginTop: 2 },
  emptyHint: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing['3xl'],
    alignItems: 'center',
  },
  emptyHintText: { fontSize: fontSize.body, textAlign: 'center', lineHeight: 24 },
});
