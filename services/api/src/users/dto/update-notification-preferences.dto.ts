import { IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateNotificationPreferencesDto {
  @ApiPropertyOptional({ description: 'Order updates (status, delivery)' })
  @IsOptional()
  @IsBoolean()
  orderUpdates?: boolean;

  @ApiPropertyOptional({ description: 'Promotions and offers' })
  @IsOptional()
  @IsBoolean()
  promotions?: boolean;
}
