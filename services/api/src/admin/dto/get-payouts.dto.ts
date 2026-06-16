import { IsIn, IsInt, IsOptional, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

const PAYOUT_STATUSES = [
  'PENDING',
  'PROCESSING',
  'COMPLETED',
  'REJECTED',
] as const;

export class GetPayoutsDto {
  @ApiPropertyOptional({ enum: PAYOUT_STATUSES })
  @IsOptional()
  @IsIn(PAYOUT_STATUSES)
  status?: (typeof PAYOUT_STATUSES)[number];

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  limit?: number = 20;
}
