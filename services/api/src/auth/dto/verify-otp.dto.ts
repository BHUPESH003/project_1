import { IsString, Matches, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PHONE_CONFIG, OTP_CODE_CONFIG } from '@/constants';

/**
 * Verify OTP DTO
 *
 * Validates request to verify OTP code
 */
export class VerifyOtpDto {
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
    description: 'OTP code received via SMS', 
    example: '123456',
    minLength: OTP_CODE_CONFIG.LENGTH,
    maxLength: OTP_CODE_CONFIG.LENGTH,
    pattern: OTP_CODE_CONFIG.PATTERN.source 
  })
  @IsString()
  @Length(OTP_CODE_CONFIG.LENGTH, OTP_CODE_CONFIG.LENGTH, {
    message: `OTP code must be exactly ${OTP_CODE_CONFIG.LENGTH} digits`,
  })
  @Matches(OTP_CODE_CONFIG.PATTERN, {
    message: 'OTP code must contain only digits',
  })
  otp!: string;
}
