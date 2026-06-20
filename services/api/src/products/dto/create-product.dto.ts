import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({ description: 'Product name', example: 'B&W Document Print' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional({ example: 'Standard 80gsm A4 paper' })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({
    description: 'Category string (e.g. "Printing Services")',
    example: 'Printing Services',
  })
  @IsString()
  category!: string;

  @ApiPropertyOptional({ example: 'PER PAGE' })
  @IsString()
  @IsOptional()
  unit?: string;

  @ApiProperty({ description: 'Selling price in rupees', example: 2 })
  @IsNumber()
  @Min(0)
  price!: number;

  @ApiPropertyOptional({
    description: 'MRP in rupees for discount display',
    example: 2.5,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  mrp?: number;

  @ApiPropertyOptional({
    description: 'S3 path for product image',
    example: 'products/abc/thumbnail.jpg',
  })
  @IsString()
  @IsOptional()
  image?: string;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  inStock?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  isBestSeller?: boolean;

  @ApiPropertyOptional({
    description: 'Flexible attribute bag for dynamic product detail page (veg, highlights, specs, variants, nutrition, etc.)',
    example: { veg: true, highlights: ['Melted Cheese', 'Golden Corn'] },
  })
  @IsOptional()
  metadata?: Record<string, unknown>;
}
