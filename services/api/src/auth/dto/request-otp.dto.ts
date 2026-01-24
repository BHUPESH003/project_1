import { IsString, IsEnum, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@repo/types';
import { PHONE_CONFIG } from '@/constants';

/**
 * Request OTP DTO
 *
 * Validates request to send OTP to phone number
 */
export class RequestOtpDto {
  @ApiProperty({ 
    description: 'Phone number in E.164 format', 
    example: PHONE_CONFIG.E164_EXAMPLE,
    pattern: PHONE_CONFIG.E164_PATTERN.source 
  })
  @IsString()
  @Matches(PHONE_CONFIG.E164_PATTERN, {
    message: `Phone number must be in E.164 format (e.g., ${PHONE_CONFIG.E164_EXAMPLE})`,
  })
  phone!: string;

  @ApiProperty({ 
    description: 'User role', 
    enum: UserRole, 
    example: UserRole.USER 
  })
  @IsEnum(UserRole, {
    message: 'Role must be one of: USER, SELLER, ADMIN',
  })
  role!: UserRole;
}
