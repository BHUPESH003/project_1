import { IsEnum, IsOptional, IsString, MaxLength, MinLength, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum NotificationTarget {
  BROADCAST = 'broadcast',
  USER = 'user',
}

export enum AdminNotificationType {
  MARKETING = 'MARKETING',
  SYSTEM = 'SYSTEM',
  ORDER_UPDATE = 'ORDER_UPDATE',
}

export class SendNotificationDto {
  @ApiProperty({ enum: NotificationTarget })
  @IsEnum(NotificationTarget)
  target!: NotificationTarget;

  @ApiPropertyOptional({ description: 'Required when target=user' })
  @ValidateIf((o) => o.target === NotificationTarget.USER)
  @IsString()
  userId?: string;

  @ApiProperty({ enum: AdminNotificationType })
  @IsEnum(AdminNotificationType)
  type!: AdminNotificationType;

  @ApiProperty({ maxLength: 80 })
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  title!: string;

  @ApiProperty({ maxLength: 300 })
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  body!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  imageUrl?: string;
}
