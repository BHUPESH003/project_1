import { IsArray, ValidateNested, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { CreateOrderDto } from './create-order.dto';

/**
 * Batch Order Creation DTO
 * Allows user to create multiple orders for different sellers in a single request
 * Each order is processed independently with its own transaction
 */
export class CreateBatchOrdersDto {
  @ApiProperty({
    description: 'Array of orders to create (one per seller)',
    type: [CreateOrderDto],
    example: [
      {
        categoryId: 'printing',
        sellerId: 'seller-1',
        orderPayload: {
          items: [{ productId: 'prod-1', quantity: 10 }],
          dropLatitude: 28.6139,
          dropLongitude: 77.209,
          dropAddress: '123 Main St, Delhi',
        },
      },
      {
        categoryId: 'hardware',
        sellerId: 'seller-2',
        orderPayload: {
          items: [{ productId: 'prod-2', quantity: 5 }],
          dropLatitude: 28.6139,
          dropLongitude: 77.209,
          dropAddress: '123 Main St, Delhi',
        },
      },
    ],
  })
  @IsArray({ message: 'orders must be an array' })
  @ValidateNested({ each: true, message: 'each order must be a valid CreateOrderDto' })
  @Type(() => CreateOrderDto)
  @IsNotEmpty({ message: 'orders array cannot be empty' })
  orders!: CreateOrderDto[];
}

/**
 * Batch Order Result - Result for each order in the batch
 */
export class BatchOrderResult {
  @ApiProperty({
    description: 'Seller ID',
    example: 'seller-1',
  })
  sellerId!: string;

  @ApiProperty({
    description: 'Order ID (null if failed)',
    example: 'order-123',
    nullable: true,
  })
  orderId?: string;

  @ApiProperty({
    description: 'Order status',
    enum: ['success', 'failed'],
    example: 'success',
  })
  status!: 'success' | 'failed';

  @ApiProperty({
    description: 'Error message (if failed)',
    example: 'Insufficient inventory',
    nullable: true,
  })
  error?: string;

  @ApiProperty({
    description: 'Total item cost',
    example: 100,
    nullable: true,
  })
  itemCost?: number;
}

/**
 * Batch Order Response - Response from batch order creation
 */
export class CreateBatchOrdersResponseDto {
  @ApiProperty({
    description: 'Array of results for each order in the batch',
    type: [BatchOrderResult],
    example: [
      {
        sellerId: 'seller-1',
        orderId: 'order-123',
        status: 'success',
        itemCost: 100,
      },
      {
        sellerId: 'seller-2',
        orderId: 'order-124',
        status: 'success',
        itemCost: 250,
      },
    ],
  })
  results!: BatchOrderResult[];

  @ApiProperty({
    description: 'Total number of orders processed',
    example: 2,
  })
  totalProcessed!: number;

  @ApiProperty({
    description: 'Number of successful orders',
    example: 2,
  })
  successCount!: number;

  @ApiProperty({
    description: 'Number of failed orders',
    example: 0,
  })
  failureCount!: number;
}
