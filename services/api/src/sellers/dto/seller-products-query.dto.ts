import {
  IsNumber,
  IsOptional,
  IsString,
  Min,
  Max,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class SellerProductsQueryDto {
  @ApiPropertyOptional({
    description: 'Catalog filter chip',
    enum: ['best_sellers', 'on_sale', 'new_arrivals'],
  })
  @IsString()
  @IsIn(['best_sellers', 'on_sale', 'new_arrivals'])
  @IsOptional()
  filter?: string;

  @ApiPropertyOptional({
    description: 'Page size (default 20)',
    minimum: 1,
    maximum: 100,
  })
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ description: 'Offset (default 0)', minimum: 0 })
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @IsOptional()
  offset?: number;
}
