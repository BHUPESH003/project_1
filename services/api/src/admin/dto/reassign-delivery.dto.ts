import { IsEnum, IsString } from 'class-validator';
import { DeliveryProvider } from '@repo/types';

/**
 * Reassign Delivery DTO
 *
 * Validates request to manually reassign delivery partner
 */
export class ReassignDeliveryDto {
  @IsEnum(DeliveryProvider, {
    message: 'Provider must be a valid DeliveryProvider',
  })
  provider!: DeliveryProvider; // Delivery provider (DUNZO, PORTER, etc.)

  @IsString()
  trackingId!: string; // Tracking ID from delivery provider
}
