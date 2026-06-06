import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GetSellersDto {
  @ApiPropertyOptional({
    description: 'Filter by status (ONLINE/OFFLINE)',
    example: 'ONLINE',
  })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({
    description: 'Filter by category ID',
    example: 'printing',
  })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ description: 'Filter verified sellers only' })
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  @IsOptional()
  isVerified?: boolean;

  @ApiPropertyOptional({ description: 'Filter suspended sellers only' })
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  @IsOptional()
  isSuspended?: boolean;

  @ApiPropertyOptional({ default: 1 })
  @Transform(({ value }) => parseInt(value as string, 10))
  @IsNumber()
  @IsOptional()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @Transform(({ value }) => parseInt(value as string, 10))
  @IsNumber()
  @IsOptional()
  @Min(1)
  limit?: number;
}
