import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterSellerDto {
  @ApiProperty({
    description: 'Display name of the shop',
    example: 'Fast Print Hub',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  shopName!: string;

  @ApiProperty({
    description: 'Full street address of the shop',
    example: '12 MG Road, Bengaluru, Karnataka',
  })
  @IsString()
  @MinLength(5)
  @MaxLength(300)
  address!: string;

  @ApiPropertyOptional({
    description: 'Short description shown to customers',
    example: 'Printing, binding, and stationery services',
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ description: 'Shop latitude', example: 12.9716 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;

  @ApiProperty({ description: 'Shop longitude', example: 77.5946 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number;

  @ApiProperty({
    description: 'Category IDs this seller supports',
    example: ['printing'],
    type: [String],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  categoryIds!: string[];

  @ApiPropertyOptional({
    description: 'Price per page in rupees (for printing sellers)',
    example: 2.5,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  pricePerPage?: number;

  @ApiPropertyOptional({
    description: 'Estimated preparation time in minutes',
    example: 15,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  prepTimeMinutes?: number;
}
