import { IsString, IsNumber, Min, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddCartProductItemDto {
  @ApiProperty({ description: 'Product ID (catalog item)' })
  @IsString()
  productId!: string;

  @ApiPropertyOptional({
    description: 'Quantity (default 1)',
    example: 1,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  @IsOptional()
  quantity?: number;

  @ApiPropertyOptional({
    description:
      'Category-specific configuration (JSON). Example: for printing: { type: \"printing\" }',
  })
  @IsObject()
  @IsOptional()
  payload?: Record<string, unknown>;
}

export class UpdateCartItemDto {
  @ApiPropertyOptional({ description: 'Quantity', minimum: 1 })
  @IsNumber()
  @Min(1)
  @IsOptional()
  quantity?: number;

  @ApiPropertyOptional({
    description: 'Category-specific configuration (JSON)',
  })
  @IsObject()
  @IsOptional()
  payload?: Record<string, unknown>;
}

export class AttachCartItemFileDto {
  @ApiProperty({ description: 'File ID (validated upload)' })
  @IsString()
  fileId!: string;

  @ApiPropertyOptional({
    description:
      'Per-file configuration (JSON). Example: { copies: 1, color: \"B&W\", paperSize: \"A4\" }',
  })
  @IsObject()
  @IsOptional()
  payload?: Record<string, unknown>;
}

export class UpdateCartItemFileDto {
  @ApiPropertyOptional({ description: 'Per-file configuration (JSON)' })
  @IsObject()
  @IsOptional()
  payload?: Record<string, unknown>;
}
