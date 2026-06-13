import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Location Service
 * Returns address/area details for given coordinates.
 * Frontend sends lat/lng; backend returns address details (e.g. for "Current Location" label).
 */
@Injectable()
export class LocationService {
  private readonly logger = new Logger(LocationService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Reverse geocode: lat/lng -> address details.
   * Can be wired to Google Geocoding or another provider via env.
   */
  async getAddressFromCoordinates(
    lat: number,
    lng: number,
  ): Promise<{
    address: string;
    area: string;
    city?: string;
    state?: string;
    country?: string;
  }> {
    // Placeholder: return a stub. Wire GOOGLE_GEOCODING_API_KEY or similar when ready.
    const useGoogle = this.configService.get<string>(
      'GOOGLE_GEOCODING_API_KEY',
    );
    if (useGoogle) {
      try {
        const res = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${useGoogle}`,
        );
        const data = await res.json();
        if (data.status === 'OK' && data.results?.[0]) {
          const r = data.results[0];
          const area =
            r.address_components?.find(
              (c: any) =>
                c.types.includes('sublocality') || c.types.includes('locality'),
            )?.long_name ??
            r.formatted_address?.split(',')[0] ??
            '';
          return {
            address: r.formatted_address ?? '',
            area: area || 'Current Location',
            city: r.address_components?.find((c: any) =>
              c.types.includes('locality'),
            )?.long_name,
            state: r.address_components?.find((c: any) =>
              c.types.includes('administrative_area_level_1'),
            )?.long_name,
            country: r.address_components?.find((c: any) =>
              c.types.includes('country'),
            )?.long_name,
          };
        }
      } catch (e) {
        this.logger.warn('Geocoding failed, returning fallback', e);
      }
    }
    return {
      address: `${lat}, ${lng}`,
      area: 'Current Location',
    };
  }

  /**
   * Autocomplete: search query -> list of suggested areas/addresses.
   */
  async getAutocomplete(query: string): Promise<Array<{
    description: string;
    placeId: string;
    mainText: string;
    secondaryText: string;
    latitude?: number;
    longitude?: number;
  }>> {
    const useGoogle = this.configService.get<string>(
      'GOOGLE_GEO_API_KEY', // Changed to match common naming
    );
    if (useGoogle) {
      try {
        const res = await fetch(
          `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&key=${useGoogle}`,
        );
        const data = await res.json();
        if (data.status === 'OK') {
          // Google autocomplete predictions do NOT include coordinates — the
          // client resolves them via getPlaceDetails(placeId) on selection.
          return data.predictions.map((p: any) => ({
            description: p.description,
            placeId: p.place_id,
            mainText: p.structured_formatting?.main_text ?? '',
            secondaryText: p.structured_formatting?.secondary_text ?? '',
          }));
        }
      } catch (e) {
        this.logger.warn('Autocomplete failed, returning mock', e);
      }
    }

    // Mock response for common local areas (coords included so selection works
    // without a Google key in dev).
    const mocks = [
      { mainText: 'Cyber City', secondaryText: 'DLF Phase 2, Gurugram', latitude: 28.4948, longitude: 77.088 },
      { mainText: 'Cyber Hub', secondaryText: 'DLF Phase 3, Gurugram', latitude: 28.4951, longitude: 77.0889 },
      { mainText: 'Ambience Mall', secondaryText: 'NH-8, Gurugram', latitude: 28.5045, longitude: 77.0967 },
      { mainText: 'Sector 29', secondaryText: 'Main Market, Gurugram', latitude: 28.467, longitude: 77.062 },
      { mainText: 'M.G. Road', secondaryText: 'Iffco Chowk, Gurugram', latitude: 28.4793, longitude: 77.07 },
    ];

    return mocks
      .filter(m => m.mainText.toLowerCase().includes(query.toLowerCase()) || m.secondaryText.toLowerCase().includes(query.toLowerCase()))
      .map((m, index) => ({
        description: `${m.mainText}, ${m.secondaryText}`,
        placeId: `mock-id-${index}`,
        mainText: m.mainText,
        secondaryText: m.secondaryText,
        latitude: m.latitude,
        longitude: m.longitude,
      }));
  }

  /**
   * Resolve a Google place_id to coordinates via the Place Details API.
   * Autocomplete predictions carry no geometry, so the client calls this after
   * the user selects a suggestion. Returns null if unresolved (caller handles).
   */
  async getPlaceDetails(placeId: string): Promise<{
    latitude: number;
    longitude: number;
    address: string;
  } | null> {
    const useGoogle = this.configService.get<string>('GOOGLE_GEO_API_KEY');
    if (useGoogle && !placeId.startsWith('mock-id-')) {
      try {
        const res = await fetch(
          `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=geometry,formatted_address&key=${useGoogle}`,
        );
        const data = await res.json();
        const loc = data?.result?.geometry?.location;
        if (data.status === 'OK' && loc) {
          return {
            latitude: loc.lat,
            longitude: loc.lng,
            address: data.result.formatted_address ?? '',
          };
        }
      } catch (e) {
        this.logger.warn('Place details failed', e);
      }
    }
    return null;
  }
}
