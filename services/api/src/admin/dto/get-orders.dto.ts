import { IsEnum, IsOptional, IsDateString } from 'class-validator';
import { OrderStatus } from '@repo/types';

/**
 * Get Orders Query DTO (Admin)
 *
 * Validates query parameters for admin order listing
 */
export class GetOrdersDto {
  @IsEnum(OrderStatus, {
    message: 'Status must be a valid OrderStatus',
  })
  @IsOptional()
  status?: OrderStatus; // Filter by order status

  @IsDateString()
  @IsOptional()
  startDate?: string; // Start date for date range filter

  @IsDateString()
  @IsOptional()
  endDate?: string; // End date for date range filter
}
