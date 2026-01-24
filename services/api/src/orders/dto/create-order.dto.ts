import { IsString, IsObject, ValidateNested, IsOptional, IsNumber, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Order Payload (category-agnostic)
 * Structure varies by category
 */
export class OrderPayloadDto {
  @ApiPropertyOptional({ description: 'File URL for printing orders', example: 'https://example.com/file.pdf' })
  @IsOptional()
  @IsString()
  fileUrl?: string;

  @ApiPropertyOptional({ description: 'Number of pages', example: 10, minimum: 1 })
  @IsOptional()
  @IsNumber()
  pages?: number;

  @ApiPropertyOptional({ description: 'Number of copies', example: 2, minimum: 1 })
  @IsOptional()
  @IsNumber()
  copies?: number;

  @ApiPropertyOptional({ description: 'Color printing', example: false })
  @IsOptional()
  @IsBoolean()
  color?: boolean;

  @ApiPropertyOptional({ description: 'Additional notes', example: 'Please handle with care' })
  @IsOptional()
  @IsString()
  notes?: string;

  // Category-agnostic: any additional fields
  [key: string]: unknown;
}

/**
 * Create Order DTO
 *
 * Validates request to create a draft order
 */
export class CreateOrderDto {
  @ApiProperty({ description: 'Category ID', example: 'cat-printing-123' })
  @IsString()
  categoryId!: string; // Category ID (e.g., "printing")

  @ApiProperty({ description: 'Order payload (category-specific details)', type: OrderPayloadDto })
  @IsObject()
  @ValidateNested()
  @Type(() => OrderPayloadDto)
  orderPayload!: OrderPayloadDto; // Category-agnostic payload
}
