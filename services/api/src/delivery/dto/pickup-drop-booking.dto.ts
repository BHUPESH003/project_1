import { IsNumber, IsString, IsLatitude, IsLongitude, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Request DTO for pickup/drop location booking
 * Standalone delivery booking without order
 * User provides pickup and drop locations with coordinates
 */
export class PickupDropBookingDto {
  @ApiProperty({
    description: 'Pickup location latitude',
    example: 28.6139,
    minimum: -90,
    maximum: 90,
  })
  @IsLatitude()
  pickupLatitude!: number;

  @ApiProperty({
    description: 'Pickup location longitude',
    example: 77.209,
    minimum: -180,
    maximum: 180,
  })
  @IsLongitude()
  pickupLongitude!: number;

  @ApiProperty({
    description: 'Pickup location address',
    example: '123 Main Street, Delhi',
  })
  @IsString()
  pickupAddress!: string;

  @ApiProperty({
    description: 'Drop location latitude',
    example: 28.5921,
    minimum: -90,
    maximum: 90,
  })
  @IsLatitude()
  dropLatitude!: number;

  @ApiProperty({
    description: 'Drop location longitude',
    example: 77.2064,
    minimum: -180,
    maximum: 180,
  })
  @IsLongitude()
  dropLongitude!: number;

  @ApiProperty({
    description: 'Drop location address',
    example: 'Apartment 456, Park Road, Delhi',
  })
  @IsString()
  dropAddress!: string;

  @ApiPropertyOptional({
    description: 'Optional item description/details',
    example: 'Documents, fragile items, etc.',
  })
  @IsString()
  @IsOptional()
  itemDescription?: string;

  @ApiPropertyOptional({
    description: 'Optional contact phone for pickup',
    example: '+91-9876543210',
  })
  @IsString()
  @IsOptional()
  pickupContactPhone?: string;

  @ApiPropertyOptional({
    description: 'Optional contact phone for drop',
    example: '+91-9123456789',
  })
  @IsString()
  @IsOptional()
  dropContactPhone?: string;
}

/**
 * Response DTO for pickup/drop booking options
 */
export class PickupDropBookingResponse {
  @ApiProperty({
    description: 'Pickup location details',
    example: {
      latitude: 28.6139,
      longitude: 77.209,
      address: '123 Main Street, Delhi',
    },
  })
  pickupLocation!: {
    latitude: number;
    longitude: number;
    address: string;
  };

  @ApiProperty({
    description: 'Drop location details',
    example: {
      latitude: 28.5921,
      longitude: 77.2064,
      address: 'Apartment 456, Park Road, Delhi',
    },
  })
  dropLocation!: {
    latitude: number;
    longitude: number;
    address: string;
  };

  @ApiProperty({
    description: 'Available delivery provider options',
    example: [
      {
        provider: 'DUNZO',
        displayName: 'Dunzo',
        estimatedFee: 95,
        estimatedDurationMinutes: 22,
        currency: 'INR',
        rating: 4.7,
        quoteId: 'quote-dunzo-xxx',
      },
      {
        provider: 'PORTER',
        displayName: 'Porter',
        estimatedFee: 120,
        estimatedDurationMinutes: 18,
        currency: 'INR',
        rating: 4.6,
        quoteId: 'quote-porter-xxx',
      },
    ],
  })
  providers!: Array<{
    provider: string;
    displayName: string;
    estimatedFee: number;
    estimatedDurationMinutes: number;
    currency: string;
    rating: number;
    quoteId: string;
  }>;

  @ApiProperty({
    description: 'Cheapest option details',
    example: {
      provider: 'DUNZO',
      displayName: 'Dunzo',
      estimatedFee: 95,
    },
  })
  cheapest?: {
    provider: string;
    displayName: string;
    estimatedFee: number;
  };

  @ApiProperty({
    description: 'Fastest option details',
    example: {
      provider: 'PORTER',
      displayName: 'Porter',
      estimatedDurationMinutes: 18,
    },
  })
  fastest?: {
    provider: string;
    displayName: string;
    estimatedDurationMinutes: number;
  };

  @ApiProperty({
    description: 'Total number of available delivery options',
    example: 3,
  })
  totalOptions!: number;

  @ApiProperty({
    description: 'Distance between pickup and drop in kilometers',
    example: 5.2,
  })
  distanceKm!: number;

  @ApiProperty({
    description: 'Response message',
    example: '3 delivery providers available for this location.',
  })
  message!: string;
}
