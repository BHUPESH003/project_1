import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SellerOrderInputDto {
  @ApiProperty({ description: 'Seller ID to place order with' })
  @IsString()
  @IsUUID()
  sellerId!: string;

  @ApiPropertyOptional({
    description: 'Selected delivery quotation ID (from /checkout/multi)',
  })
  @IsString()
  @IsOptional()
  quotationId?: string;

  @ApiPropertyOptional({
    description: 'Delivery fee in rupees (for reference only)',
    example: 95,
  })
  @IsNumber()
  @IsOptional()
  deliveryFeeRupees?: number;

  @ApiPropertyOptional({
    description: 'Estimated delivery time in minutes',
    example: 25,
  })
  @IsNumber()
  @IsOptional()
  estimatedMinutes?: number;

  @ApiPropertyOptional({
    description: 'Vehicle type (bike, car, tempo, etc)',
    example: 'bike',
  })
  @IsString()
  @IsOptional()
  vehicleType?: string;
}

export class PlaceMultiOrderDto {
  @ApiProperty({
    description: 'Delivery address ID to use for all orders in this batch',
  })
  @IsString()
  @IsUUID()
  deliveryAddressId!: string;

  @ApiProperty({
    description:
      'One entry per seller to order from; all sellers must have items in cart',
    type: [SellerOrderInputDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SellerOrderInputDto)
  sellers!: SellerOrderInputDto[];
}
