import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Select Seller DTO
 *
 * Validates request to assign seller to order
 */
export class SelectSellerDto {
  @ApiProperty({
    description: 'Seller ID to assign to the order',
    example: 'seller-123',
  })
  @IsString()
  sellerId!: string; // Seller ID to assign
}
