import {
  IsEnum,
  IsOptional,
  IsDateString,
  IsString,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
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

  @IsString()
  @IsOptional()
  sellerId?: string; // Filter by seller ID

  @IsDateString()
  @IsOptional()
  startDate?: string; // Start date for date range filter

  @IsDateString()
  @IsOptional()
  endDate?: string; // End date for date range filter

  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  page?: number = 1; // Page number (default: 1)

  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  limit?: number = 20; // Items per page (default: 20)
}
