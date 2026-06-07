import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class GetDiscoverySellersDto {
  @ApiProperty({ description: 'Latitude of the search origin' })
  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number;

  @ApiProperty({ description: 'Longitude of the search origin' })
  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng!: number;

  @ApiPropertyOptional({
    description: 'Search radius in metres (100–50000, default 5000)',
    default: 5000,
  })
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  @Min(100)
  @Max(50000)
  @IsOptional()
  radius?: number = 5000;

  @ApiPropertyOptional({
    description: 'Category slug to filter by (e.g. "printing")',
  })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({
    description: 'Maximum results to return (default 40)',
    default: 40,
  })
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 40;
}
