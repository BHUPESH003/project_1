import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';

/**
 * Auth Controller - MVP Scope
 *
 * API Contract v1 endpoints ONLY:
 * - POST /v1/auth/request-otp
 * - POST /v1/auth/verify-otp
 *
 * Removed:
 * - login/register/logout (not in API Contract)
 * - Generic auth flows (OTP-based only)
 */
@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /v1/auth/request-otp
   * Sends OTP to phone number for given role
   */
  @Post('request-otp')
  @ApiOperation({ summary: 'Request OTP', description: 'Sends an OTP code to the provided phone number via SMS. The OTP is valid for 10 minutes.' })
  @ApiResponse({ status: 200, description: 'OTP sent successfully' })
  @ApiResponse({ status: 400, description: 'Invalid phone number or role' })
  @ApiResponse({ status: 429, description: 'Too many OTP requests. Please try again later.' })
  requestOtp(@Body() requestOtpDto: RequestOtpDto) {
    return this.authService.requestOtp(requestOtpDto);
  }

  /**
   * POST /v1/auth/verify-otp
   * Verifies OTP and returns JWT token
   */
  @Post('verify-otp')
  @ApiOperation({ summary: 'Verify OTP', description: 'Verifies the OTP code and returns a JWT token for authentication. The token is required for protected endpoints.' })
  @ApiResponse({ status: 200, description: 'OTP verified successfully. Returns JWT token.' })
  @ApiResponse({ status: 400, description: 'Invalid OTP code or phone number' })
  @ApiResponse({ status: 401, description: 'Invalid or expired OTP code' })
  verifyOtp(@Body() verifyOtpDto: VerifyOtpDto) {
    return this.authService.verifyOtp(verifyOtpDto);
  }

  // ❌ REMOVED: login, register, logout - not in API Contract v1
  // MVP uses OTP-only authentication flow
}
