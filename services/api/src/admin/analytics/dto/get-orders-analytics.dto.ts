import { IsEnum, IsOptional, IsDateString } from 'class-validator';

export enum AnalyticsGranularity {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
}

export class GetOrdersAnalyticsDto {
  @IsOptional()
  @IsEnum(AnalyticsGranularity)
  granularity?: AnalyticsGranularity = AnalyticsGranularity.DAILY;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
