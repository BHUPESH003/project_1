import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Reject Order DTO
 *
 * Validates request to reject an order
 */
export class RejectOrderDto {
  @ApiPropertyOptional({ 
    description: 'Reason for rejecting the order', 
    example: 'Currently too busy to handle this order',
    maxLength: 500 
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  reason?: string; // Optional reason for rejection
}
