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
}
