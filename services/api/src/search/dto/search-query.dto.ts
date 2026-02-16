import { IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class SearchQueryDto {
  @ApiPropertyOptional({
    description: 'Search query (shops, items or services)',
  })
  @IsString()
  @IsOptional()
  q?: string;

  @ApiPropertyOptional({
    description: 'Max results per type (default 20)',
    minimum: 1,
    maximum: 50,
  })
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(50)
  @IsOptional()
  limit?: number;
}
