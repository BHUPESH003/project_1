import {
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSellerDto {
  @ApiPropertyOptional({ example: 'Fast Print Hub' })
  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(100)
  shopName?: string;

  @ApiPropertyOptional({ example: '12 MG Road, Bengaluru' })
  @IsString()
  @IsOptional()
  @MinLength(5)
  @MaxLength(300)
  address?: string;

  @ApiPropertyOptional({ example: 'Printing and binding services' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ example: 12.9716 })
  @IsNumber()
  @IsOptional()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional({ example: 77.5946 })
  @IsNumber()
  @IsOptional()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiPropertyOptional({ example: 2.5 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  pricePerPage?: number;

  @ApiPropertyOptional({ example: 15 })
  @IsNumber()
  @IsOptional()
  @Min(1)
  prepTimeMinutes?: number;

  @ApiPropertyOptional({
    description: 'S3 path returned from presigned-url upload',
    example: 'sellers/abc123/cover.jpg',
  })
  @IsString()
  @IsOptional()
  imagePath?: string;
}
