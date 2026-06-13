import { IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GetCheckoutQueryDto {
  @ApiProperty({
    description: 'Seller ID for which checkout summary is requested',
  })
  @IsString()
  sellerId!: string;

  @ApiPropertyOptional({
    description: 'Delivery address ID selected by user',
  })
  @IsOptional()
  @IsString()
  deliveryAddressId?: string;
}
