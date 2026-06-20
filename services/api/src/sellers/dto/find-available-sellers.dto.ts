import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsIn,
  Min,
  Max,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';

/**
 * Find Available Sellers Query DTO
 *
 * Validates query parameters for seller discovery
 */
export class FindAvailableSellersDto {
  @ApiPropertyOptional({
    description: 'Category ID to filter sellers',
    example: 'cat-printing-123',
  })
  @IsString()
  @IsOptional()
  category?: string; // Category ID (e.g., "printing")

  @ApiPropertyOptional({
    description: 'Latitude for location-based filtering',
    example: 28.6139,
    minimum: -90,
    maximum: 90,
  })
  @IsNumber()
  @Type(() => Number)
  @Min(-90)
  @Max(90)
  @IsOptional()
  lat?: number; // Latitude for location-based filtering

  @ApiPropertyOptional({
    description: 'Longitude for location-based filtering',
    example: 77.209,
    minimum: -180,
    maximum: 180,
  })
  @IsNumber()
  @Type(() => Number)
  @Min(-180)
  @Max(180)
  @IsOptional()
  lng?: number; // Longitude for location-based filtering

  @ApiPropertyOptional({
    description:
      'Max distance in km (only return sellers within this radius when lat/lng provided). Default 50.',
    example: 50,
    minimum: 1,
    maximum: 500,
  })
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(500)
  @IsOptional()
  maxDistanceKm?: number; // When set with lat/lng, only sellers within this radius

  @ApiPropertyOptional({
    description: 'Page size (default 20)',
    example: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({
    description: 'Offset for pagination (default 0)',
    example: 0,
    minimum: 0,
  })
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @IsOptional()
  offset?: number;

  @ApiPropertyOptional({
    description:
      'Sort order. "nearest" (default, by distance — requires lat/lng), "rating" (top rated first), "newest" (recently added first).',
    enum: ['nearest', 'rating', 'newest'],
    example: 'nearest',
  })
  @IsIn(['nearest', 'rating', 'newest'])
  @IsOptional()
  sort?: 'nearest' | 'rating' | 'newest';

  @ApiPropertyOptional({
    description: 'When true, only return sellers with an active discount/offer.',
    example: true,
  })
  // Query params arrive as strings — coerce "true"/"false" to a real boolean.
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  @IsOptional()
  hasOffers?: boolean;

  @ApiPropertyOptional({
    description: 'Only return sellers with a rating >= this value (0–5).',
    example: 4,
    minimum: 0,
    maximum: 5,
  })
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @Max(5)
  @IsOptional()
  minRating?: number;
}
