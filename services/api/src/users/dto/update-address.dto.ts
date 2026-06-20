import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateAddressDto {
  @ApiPropertyOptional({ description: 'Address label' })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiPropertyOptional({ description: 'Full address line (building, flat, street)' })
  @IsOptional()
  @IsString()
  addressLine?: string;

  @ApiPropertyOptional({ description: 'Receiver name for delivery' })
  @IsOptional()
  @IsString()
  receiverName?: string | null;

  @ApiPropertyOptional({ description: 'Receiver phone for delivery' })
  @IsOptional()
  @IsString()
  receiverPhone?: string | null;
}
