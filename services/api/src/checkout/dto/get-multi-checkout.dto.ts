import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GetMultiCheckoutQueryDto {
  @ApiProperty({
    description: 'Delivery address ID to use for all sellers in this checkout',
  })
  // IDs are Prisma cuids (not UUIDs) — validate as a plain string.
  @IsString()
  deliveryAddressId!: string;
}
