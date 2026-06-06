import { IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GetMultiCheckoutQueryDto {
  @ApiProperty({
    description: 'Delivery address ID to use for all sellers in this checkout',
  })
  @IsString()
  @IsUUID()
  deliveryAddressId!: string;
}
