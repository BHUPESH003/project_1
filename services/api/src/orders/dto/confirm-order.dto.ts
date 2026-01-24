import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '@repo/types';

/**
 * Confirm Order DTO
 *
 * Validates request to confirm and pay for order
 */
export class ConfirmOrderDto {
  @ApiPropertyOptional({ 
    description: 'Payment method', 
    enum: PaymentMethod, 
    example: PaymentMethod.UPI,
    default: PaymentMethod.UPI 
  })
  @IsEnum(PaymentMethod, {
    message: 'Payment method must be UPI, CASH, or CARD',
  })
  @IsOptional()
  paymentMethod?: PaymentMethod; // Default: UPI for MVP
}
