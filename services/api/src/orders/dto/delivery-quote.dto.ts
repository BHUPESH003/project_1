import {
  IsNumber,
  Min,
  Max,
  ValidateNested,
  IsObject,
  IsString,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Drop Location DTO
 */
export class DropLocationDto {
  @ApiProperty({ description: 'Latitude', example: 28.6139, minimum: -90, maximum: 90 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number; // Latitude

  @ApiProperty({ description: 'Longitude', example: 77.2090, minimum: -180, maximum: 180 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng!: number; // Longitude

  @ApiPropertyOptional({ description: 'Optional address', example: '123 Main St, City' })
  @IsString()
  @IsOptional()
  address?: string; // Optional address
}

/**
 * Delivery Quote DTO
 *
 * Validates request to get delivery pricing
 */
export class DeliveryQuoteDto {
  @ApiProperty({ description: 'Customer delivery location', type: DropLocationDto })
  @IsObject()
  @ValidateNested()
  @Type(() => DropLocationDto)
  dropLocation!: DropLocationDto; // Customer delivery location
}
