import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsUUID } from 'class-validator';

export class PlaceOrderDto {
  @ApiProperty({
    description: 'Seller ID for which order is being placed',
  })
  @IsString()
  @IsUUID()
  sellerId!: string;

  @ApiProperty({
    description: 'Delivery address ID selected by user',
  })
  @IsString()
  @IsUUID()
  deliveryAddressId!: string;

  @ApiProperty({
    description:
      'Selected delivery quotation ID (includes provider + vehicle option)',
  })
  @IsString()
  quotationId!: string;

  @ApiProperty({
    description: 'Quoted delivery fee in rupees (for reference only)',
    example: 95,
  })
  @IsNumber()
  deliveryFeeRupees!: number;

  @ApiProperty({
    description: 'Estimated delivery time in minutes',
    example: 25,
  })
  @IsNumber()
  estimatedMinutes!: number;

  @ApiProperty({
    description:
      'Vehicle type selected by user (bike, car, tempo, etc). Free text for now.',
    example: 'bike',
  })
  @IsString()
  vehicleType!: string;
}
