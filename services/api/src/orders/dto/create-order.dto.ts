import { IsString, IsObject, ValidateNested, IsOptional, IsNumber, IsBoolean, IsArray, Min } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Helper: Transform empty strings to undefined
const emptyToUndefined = () => Transform(({ value }: { value: any }) => (value === '' || value === null ? undefined : value));

/**
 * Order Item DTO (for product-based orders)
 * Frontend ONLY sends: productId and quantity
 * Backend fetches price from product database and calculates totalPrice
 */
export class OrderItemDto {
  @ApiProperty({ 
    description: 'Product ID (required)', 
    example: 'prod-123' 
  })
  @IsString({ message: 'productId must be a string' })
  productId!: string;

  @ApiProperty({ 
    description: 'Quantity ordered (required)', 
    example: 2,
    minimum: 1 
  })
  @IsNumber({}, { message: 'quantity must be a number' })
  @Min(1, { message: 'quantity must be at least 1' })
  quantity!: number;

  // DO NOT SEND THESE - Backend auto-populates from database
  @ApiPropertyOptional({ 
    description: '[AUTO-FILLED] Item name fetched from product',
    example: 'Product Name',
    readOnly: true 
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ 
    description: '[AUTO-FILLED] Unit price fetched from product',
    example: 100,
    readOnly: true 
  })
  @IsOptional()
  @IsNumber()
  price?: number;

  @ApiPropertyOptional({ 
    description: '[AUTO-CALCULATED] Total price = quantity × unit price',
    example: 200,
    readOnly: true 
  })
  @IsOptional()
  @IsNumber()
  totalPrice?: number;
}

/**
 * Order Payload (category-agnostic)
 * Structure varies by category
 */
export class OrderPayloadDto {
  // For printing orders
  @ApiPropertyOptional({ description: 'File URL for printing orders', example: 'https://example.com/file.pdf' })
  @IsOptional()
  @IsString()
  fileUrl?: string;

  @ApiPropertyOptional({ description: 'Number of pages', example: 10, minimum: 1 })
  @emptyToUndefined()
  @IsOptional()
  @IsNumber()
  pages?: number;

  @ApiPropertyOptional({ description: 'Number of copies', example: 2, minimum: 1 })
  @emptyToUndefined()
  @IsOptional()
  @IsNumber()
  copies?: number;

  @ApiPropertyOptional({ description: 'Color printing', example: false })
  @IsOptional()
  @IsBoolean()
  color?: boolean;

  // For product orders (hardware, stationary, etc.)
  @ApiPropertyOptional({
    description: 'Order items (products)',
    example: [
      { productId: 'prod-1', name: 'Item 1', quantity: 2, price: 100, totalPrice: 200 },
    ],
    type: [OrderItemDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items?: OrderItemDto[];

  @ApiPropertyOptional({ description: 'Additional notes', example: 'Please handle with care' })
  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * Create Order DTO
 *
 * Validates request to create a draft order
 * Recommended flow: 1) Get sellers 2) Get seller products 3) Create order with sellerId
 */
export class CreateOrderDto {
  @ApiProperty({ description: 'Category ID', example: 'hardware' })
  @IsString()
  categoryId!: string;

  @ApiPropertyOptional({ 
    description: 'Seller ID (optional - if provided, seller is pre-selected before order creation)', 
    example: 'seller-123' 
  })
  @IsOptional()
  @IsString()
  sellerId?: string;

  @ApiProperty({ description: 'Order payload (category-specific details)', type: OrderPayloadDto })
  @IsObject()
  @ValidateNested()
  @Type(() => OrderPayloadDto)
  orderPayload!: OrderPayloadDto;
}
