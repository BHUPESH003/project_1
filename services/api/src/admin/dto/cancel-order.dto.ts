import {
  IsString,
  IsNumber,
  IsOptional,
  Min,
  MaxLength,
} from 'class-validator';

/**
 * Cancel Order DTO
 *
 * Validates request to cancel order and process refund
 */
export class CancelOrderDto {
  @IsString()
  @IsOptional()
  @MaxLength(500)
  reason?: string; // Reason for cancellation

  @IsNumber()
  @IsOptional()
  @Min(0)
  refundAmount?: number; // Refund amount (if different from order total)
}
