import { IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Find Available Sellers Query DTO
 *
 * Validates query parameters for seller discovery
 */
export class FindAvailableSellersDto {
  @ApiPropertyOptional({ 
    description: 'Category ID to filter sellers', 
    example: 'cat-printing-123' 
  })
  @IsString()
  @IsOptional()
  category?: string; // Category ID (e.g., "printing")

  @ApiPropertyOptional({ 
    description: 'Latitude for location-based filtering', 
    example: 28.6139, 
    minimum: -90, 
    maximum: 90 
  })
  @IsNumber()
  @Type(() => Number)
  @Min(-90)
  @Max(90)
  @IsOptional()
  lat?: number; // Latitude for location-based filtering

  @ApiPropertyOptional({ 
    description: 'Longitude for location-based filtering', 
    example: 77.2090, 
    minimum: -180, 
    maximum: 180 
  })
  @IsNumber()
  @Type(() => Number)
  @Min(-180)
  @Max(180)
  @IsOptional()
  lng?: number; // Longitude for location-based filtering
}
