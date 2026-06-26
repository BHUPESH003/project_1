import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { latLngToCell } from 'h3-js';
import axios from 'axios';
import { CacheService } from '@/cache/cache.service';
import { SellerRepository } from '@/sellers/repositories/seller.repository';
import { buildAssetUrl } from '@/common/utils/asset-url.util';
import { GetDiscoverySellersDto } from './dto/get-discovery-sellers.dto';

const PLACES_CACHE_TTL = 86400; // 24 hours
const H3_RESOLUTION = 7; // ~5 km² hex cells — good balance for ~5 km radius searches

interface GooglePlaceResult {
  placeId: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  rating: number | null;
  openNow: boolean | null;
  photoRef: string | null;
}

@Injectable()
export class DiscoveryService {
  private readonly logger = new Logger(DiscoveryService.name);

  constructor(
    private readonly sellerRepository: SellerRepository,
    private readonly cacheService: CacheService,
    private readonly configService: ConfigService,
  ) {}

  async discoverSellers(query: GetDiscoverySellersDto, userId?: string) {
    const { lat, lng, radius = 5000, category, limit = 40 } = query;
    const radiusKm = radius / 1000;

    // Fetch onboarded sellers from DB in parallel with Places lookup
    const [onboardedResult, placesResults] = await Promise.all([
      this.sellerRepository.findAvailable({
        lat,
        lng,
        maxDistanceKm: radiusKm,
        categoryId: category,
        limit: 50,
      }),
      this.getPlacesWithCache(lat, lng, radius, category),
    ]);

    const onboarded = onboardedResult.sellers;

    // Build a set of claimed Google Place IDs so we don't show duplicates
    const claimedPlaceIds = new Set(
      onboarded.map((s) => s.googlePlaceId).filter(Boolean),
    );

    // Filter out unverified results that match an onboarded seller
    const unverified = placesResults.filter(
      (p) => !claimedPlaceIds.has(p.placeId),
    );

    const apiKey = this.getApiKey();

    // Format verified (onboarded) sellers
    const verifiedSellers = onboarded.map((s) => ({
      source: 'platform' as const,
      verified: true,
      id: s.id,
      googlePlaceId: s.googlePlaceId ?? null,
      name: s.shopName,
      address: s.address,
      latitude: Number(s.latitude),
      longitude: Number(s.longitude),
      rating: s.rating,
      imagePath: s.imagePath ?? null,
      imageUrl: buildAssetUrl(s.imagePath, {
        s3PublicBaseUrl: this.configService.get<string>('S3_PUBLIC_BASE_URL'),
        s3Bucket: this.configService.get<string>('S3_BUCKET_NAME'),
        s3Region: this.configService.get<string>('AWS_REGION'),
      }),
      status: s.status,
      isTrending: s.isTrending,
      pricePerPage: s.pricePerPage != null ? Number(s.pricePerPage) : null,
      prepTimeMinutes: s.prepTimeMinutes,
      categories: s.categories?.map((c) => c.category) ?? [],
      actions: ['order', 'message'],
    }));

    // Format unverified (Google Places) sellers
    const unverifiedSellers = unverified
      .slice(0, Math.max(limit - verifiedSellers.length, 0))
      .map((p) => ({
        source: 'google_places' as const,
        verified: false,
        placeId: p.placeId,
        name: p.name,
        address: p.address,
        latitude: p.latitude,
        longitude: p.longitude,
        rating: p.rating,
        openNow: p.openNow,
        photoUrl:
          p.photoRef && apiKey
            ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${p.photoRef}&key=${apiKey}`
            : null,
        actions: ['message'],
      }));

    return {
      sellers: [...verifiedSellers, ...unverifiedSellers],
      total: verifiedSellers.length + unverifiedSellers.length,
      breakdown: {
        verified: verifiedSellers.length,
        unverified: unverifiedSellers.length,
      },
    };
  }

  // ─── Google Places fetch + H3 cache ──────────────────────────────────────

  private async getPlacesWithCache(
    lat: number,
    lng: number,
    radius: number,
    category?: string,
  ): Promise<GooglePlaceResult[]> {
    const keyword = this.categoryToSearchTerm(category);
    const cacheKey = this.buildCacheKey(lat, lng, keyword);

    if (cacheKey) {
      const cached = await this.cacheService.get<GooglePlaceResult[]>(cacheKey);
      if (cached) {
        this.logger.debug(`Places cache hit: ${cacheKey}`);
        return cached;
      }
    }

    const results = await this.fetchFromGooglePlaces(lat, lng, radius, keyword);

    if (cacheKey && results.length > 0) {
      await this.cacheService.set(cacheKey, results, PLACES_CACHE_TTL);
    }

    return results;
  }

  private async fetchFromGooglePlaces(
    lat: number,
    lng: number,
    radius: number,
    keyword: string,
  ): Promise<GooglePlaceResult[]> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      this.logger.warn('GOOGLE_MAPS_API_KEY not set — skipping Places lookup');
      return [];
    }

    try {
      const res = await axios.get(
        'https://maps.googleapis.com/maps/api/place/nearbysearch/json',
        {
          params: {
            location: `${lat},${lng}`,
            radius,
            keyword,
            key: apiKey,
          },
          timeout: 8000,
        },
      );

      if (res.data.status !== 'OK' && res.data.status !== 'ZERO_RESULTS') {
        this.logger.warn(`Places API error: ${res.data.status}`);
        return [];
      }

      return (res.data.results ?? []).map((place: any) => ({
        placeId: place.place_id,
        name: place.name,
        address: place.vicinity ?? '',
        latitude: place.geometry?.location?.lat ?? 0,
        longitude: place.geometry?.location?.lng ?? 0,
        rating: place.rating ?? null,
        openNow: place.opening_hours?.open_now ?? null,
        photoRef: place.photos?.[0]?.photo_reference ?? null,
      }));
    } catch (err: any) {
      this.logger.error(`Google Places fetch failed: ${err?.message}`);
      return [];
    }
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private buildCacheKey(lat: number, lng: number, keyword: string): string {
    try {
      const h3Index = latLngToCell(lat, lng, H3_RESOLUTION);
      return `discovery:${keyword}:${h3Index}`;
    } catch {
      return '';
    }
  }

  private categoryToSearchTerm(category?: string): string {
    const map: Record<string, string> = {
      printing: 'print shop',
      stationery: 'stationery store',
      hardware: 'hardware store',
      grocery: 'grocery store',
      pharmacy: 'pharmacy',
    };
    if (!category) return 'local shop';
    return map[category.toLowerCase()] ?? category;
  }

  private getApiKey(): string {
    return (
      this.configService.get<string>('GOOGLE_PLACES_API_KEY') ??
      this.configService.get<string>('GOOGLE_MAPS_API_KEY') ??
      this.configService.get<string>('GOOGLE_GEOCODING_API_KEY') ??
      ''
    );
  }
}
