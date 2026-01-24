import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SellerStatus } from '@repo/types';

/**
 * Set Seller Status DTO
 *
 * Validates request to update seller availability status
 */
export class SetStatusDto {
  @ApiProperty({ 
    description: 'Seller availability status', 
    enum: SellerStatus, 
    example: SellerStatus.ONLINE 
  })
  @IsEnum(SellerStatus, {
    message: 'Status must be either ONLINE or OFFLINE',
  })
  status!: SellerStatus;
}
