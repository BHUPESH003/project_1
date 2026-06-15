import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum EarningsPeriod {
  TODAY = 'today',
  WEEK = 'week',
  MONTH = 'month',
  ALL = 'all',
}

/**
 * Get Earnings Query DTO
 *
 * Period selector for the seller earnings summary. Defaults to ALL time.
 */
export class GetEarningsDto {
  @ApiPropertyOptional({
    description: 'Time window for the earnings summary',
    enum: EarningsPeriod,
    example: EarningsPeriod.MONTH,
    default: EarningsPeriod.ALL,
  })
  @IsOptional()
  @IsEnum(EarningsPeriod, {
    message: 'Period must be one of: today, week, month, all',
  })
  period?: EarningsPeriod = EarningsPeriod.ALL;
}
