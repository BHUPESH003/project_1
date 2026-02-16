import { IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
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
}
