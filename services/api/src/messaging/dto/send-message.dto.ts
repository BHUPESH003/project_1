import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsIn, MaxLength, IsUrl } from 'class-validator';

export class SendMessageDto {
  @ApiProperty({ description: 'Message text content' })
  @IsString()
  @MaxLength(4096)
  content!: string;

  @ApiPropertyOptional({
    enum: ['text', 'image', 'file', 'template'],
    default: 'text',
  })
  @IsString()
  @IsIn(['text', 'image', 'file', 'template'])
  @IsOptional()
  contentType?: string = 'text';

  @ApiPropertyOptional({ description: 'S3 URL for image or file messages' })
  @IsUrl()
  @IsOptional()
  mediaUrl?: string;
}
