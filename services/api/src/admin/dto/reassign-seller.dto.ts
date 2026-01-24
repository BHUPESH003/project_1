import { IsString } from 'class-validator';

/**
 * Reassign Seller DTO
 *
 * Validates request to manually reassign seller to order
 */
export class ReassignSellerDto {
  @IsString()
  sellerId!: string; // New seller ID to assign
}
