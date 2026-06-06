import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Cancel Order DTO
 *
 * Validates a user's request to cancel their own order.
 */
export class CancelOrderDto {
  @ApiPropertyOptional({
    description: 'Reason for cancelling the order',
    example: 'Ordered by mistake',
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  reason?: string; // Optional reason for cancellation
}
