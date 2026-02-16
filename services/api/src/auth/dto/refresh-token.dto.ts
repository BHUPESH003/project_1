import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

/**
 * Refresh Token DTO
 *
 * Used to request a new access token using a valid refresh token.
 */
export class RefreshTokenDto {
  @ApiProperty({
    description: 'Valid refresh token obtained from verify-otp',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsNotEmpty()
  @IsString()
  refreshToken!: string;
}
