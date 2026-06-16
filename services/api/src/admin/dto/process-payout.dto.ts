import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ProcessPayoutDto {
  @ApiPropertyOptional({
    description: 'Optional note recorded with the settled payout',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
