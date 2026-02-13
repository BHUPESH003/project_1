import { IsNumber, IsString, IsLatitude, IsLongitude, Max, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Request DTO for getting delivery quotations
 * User provides pickup (seller) and drop (user) locations
 */
export class GetQuotationsDto {
  @ApiProperty({
    description: 'Pickup location latitude (seller location)',
    example: 28.6139,
    minimum: -90,
    maximum: 90,
  })
  @IsLatitude()
  pickupLatitude!: number;

  @ApiProperty({
    description: 'Pickup location longitude (seller location)',
    example: 77.209,
    minimum: -180,
    maximum: 180,
  })
  @IsLongitude()
  pickupLongitude!: number;

  @ApiProperty({
    description: 'Pickup address (seller address)',
    example: 'Shop #123, Main Street, Delhi',
  })
  @IsString()
  pickupAddress!: string;

  @ApiProperty({
    description: 'Drop location latitude (user location)',
    example: 28.5921,
    minimum: -90,
    maximum: 90,
  })
  @IsLatitude()
  dropLatitude!: number;

  @ApiProperty({
    description: 'Drop location longitude (user location)',
    example: 77.2064,
    minimum: -180,
    maximum: 180,
  })
  @IsLongitude()
  dropLongitude!: number;

  @ApiProperty({
    description: 'Drop address (user delivery address)',
    example: 'Apartment #456, Park Road, Delhi',
  })
  @IsString()
  dropAddress!: string;
}

/**
 * Delivery partner quotation response
 */
export class DeliveryPartnerQuotation {
  @ApiProperty({
    description: 'Unique quotation ID',
    example: 'quote-dunzo-xxx',
  })
  quotationId!: string;

  @ApiProperty({
    description: 'Delivery provider name',
    example: 'Dunzo',
  })
  providerName!: string;

  @ApiProperty({
    description: 'Internal provider ID',
    example: 'dunzo',
  })
  providerId!: string;

  @ApiProperty({
    description: 'Quoted delivery fee in rupees',
    example: 95,
  })
  quotedFeeRupees!: number;

  @ApiProperty({
    description: 'Estimated delivery time in minutes',
    example: 22,
  })
  estimatedMinutes!: number;

  @ApiProperty({
    description: 'Partner availability (true = can deliver)',
    example: true,
  })
  isAvailable!: boolean;

  @ApiProperty({
    description: 'Reason if unavailable',
    example: 'Service area not covered',
    required: false,
  })
  unavailabilityReason?: string;

  @ApiProperty({
    description: 'Priority for display (lower = higher)',
    example: 0,
  })
  priority!: number;

  @ApiProperty({
    description: 'Success rate percentage',
    example: 99.5,
  })
  successRatePercent!: number;

  @ApiProperty({
    description: 'When this quotation expires',
    example: '2026-02-13T13:50:00Z',
  })
  expiresAt!: Date;

  constructor(data: Partial<DeliveryPartnerQuotation>) {
    Object.assign(this, data);
  }
}

/**
 * Response DTO for get available delivery partners endpoint
 */
export class AvailableDeliveryPartnersResponse {
  @ApiProperty({
    description: 'Array of available delivery partner quotations',
    type: [DeliveryPartnerQuotation],
  })
  partners!: DeliveryPartnerQuotation[];

  @ApiProperty({
    description: 'Cheapest option (if available)',
    type: DeliveryPartnerQuotation,
    required: false,
  })
  cheapest?: DeliveryPartnerQuotation;

  @ApiProperty({
    description: 'Fastest option (if available)',
    type: DeliveryPartnerQuotation,
    required: false,
  })
  fastest?: DeliveryPartnerQuotation;

  @ApiProperty({
    description: 'Recommended option',
    type: DeliveryPartnerQuotation,
    required: false,
  })
  recommended?: DeliveryPartnerQuotation;

  constructor(data: Partial<AvailableDeliveryPartnersResponse>) {
    Object.assign(this, data);
  }
}
