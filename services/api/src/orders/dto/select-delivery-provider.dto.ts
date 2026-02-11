/**
 * Select Delivery Provider DTO
 *
 * Request body for POST /orders/:id/select-delivery-provider
 * User selects preferred delivery partner from available options.
 */

import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class SelectDeliveryProviderDto {
  @IsString()
  @IsNotEmpty()
  provider!: string; // Provider name (e.g., 'UBER_DIRECT', 'DUNZO', 'PORTER')

  @IsOptional()
  @IsString()
  deliveryAddressId?: string; // User's delivery address ID

  @IsOptional()
  @IsString()
  quoteId?: string; // Optional: Provider-specific quote ID
}
