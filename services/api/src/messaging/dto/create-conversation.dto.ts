import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength } from 'class-validator';

export class CreateConversationDto {
  @ApiProperty({ description: 'Seller to start a conversation with' })
  @IsString()
  sellerId!: string;

  @ApiPropertyOptional({ description: 'Order this conversation relates to' })
  @IsString()
  @IsOptional()
  orderId?: string;

  @ApiPropertyOptional({ description: 'First message to send' })
  @IsString()
  @MaxLength(4096)
  @IsOptional()
  initialMessage?: string;
}
