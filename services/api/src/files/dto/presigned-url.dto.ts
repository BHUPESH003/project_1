import { IsString, IsNumber, Min, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Presigned URL Request DTO
 */
export class PresignedUrlDto {
  @ApiProperty({ description: 'Original file name', example: 'document.pdf' })
  @IsString()
  fileName!: string;

  @ApiProperty({ description: 'File MIME type', example: 'application/pdf' })
  @IsString()
  mimeType!: string;

  @ApiProperty({ description: 'File size in bytes', example: 1024000, minimum: 1 })
  @IsNumber()
  @Min(1)
  fileSize!: number;

  @ApiPropertyOptional({ description: 'Order ID if file is for existing order', example: 'order-123' })
  @IsOptional()
  @IsString()
  orderId?: string;
}
