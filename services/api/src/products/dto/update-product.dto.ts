import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProductDto {
  @ApiPropertyOptional({ example: 'Color Document Print' })
  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ example: 'Printing Services' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ example: 'PER PAGE' })
  @IsString()
  @IsOptional()
  unit?: string;

  @ApiPropertyOptional({ example: 3.5 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ example: 4 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  mrp?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  image?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  inStock?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isBestSeller?: boolean;

  @ApiPropertyOptional({
    description: 'Flexible attribute bag for dynamic product detail page',
  })
  @IsOptional()
  metadata?: Record<string, unknown>;
}
