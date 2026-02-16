import { IsString, IsNumber, Min, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Validate File Request DTO
 */
export class ValidateFileDto {
  @ApiProperty({
    description: 'S3 file key',
    example: 'orders/draft/1234567890-abc123.pdf',
  })
  @IsString()
  fileKey!: string;

  @ApiPropertyOptional({
    description: 'Order ID (optional for cart files)',
    example: 'order-123',
  })
  @IsString()
  @IsOptional()
  orderId?: string;

  @ApiProperty({ description: 'Original file name', example: 'document.pdf' })
  @IsString()
  originalName!: string;

  @ApiProperty({ description: 'File MIME type', example: 'application/pdf' })
  @IsString()
  mimeType!: string;

  @ApiProperty({
    description: 'File size in bytes',
    example: 1024000,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  sizeBytes!: number;
}
