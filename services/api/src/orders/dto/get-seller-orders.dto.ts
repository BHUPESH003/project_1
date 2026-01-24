import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus } from '@repo/types';

/**
 * Get Seller Orders Query DTO
 *
 * Validates query parameters for seller order listing
 */
export class GetSellerOrdersDto {
  @ApiPropertyOptional({ 
    description: 'Filter orders by status', 
    enum: OrderStatus, 
    example: OrderStatus.CREATED 
  })
  @IsEnum(OrderStatus, {
    message: 'Status must be a valid OrderStatus',
  })
  @IsOptional()
  status?: OrderStatus; // Filter by order status
}
