import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';

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
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /v1/auth/request-otp
   * Sends OTP to phone number for given role
   */
  @Post('request-otp')
  requestOtp(@Body() requestOtpDto: Record<string, unknown>) {
    return this.authService.requestOtp(requestOtpDto);
  }

  /**
   * POST /v1/auth/verify-otp
   * Verifies OTP and returns JWT token
   */
  @Post('verify-otp')
  verifyOtp(@Body() verifyOtpDto: Record<string, unknown>) {
    return this.authService.verifyOtp(verifyOtpDto);
  }

  // ❌ REMOVED: login, register, logout - not in API Contract v1
  // MVP uses OTP-only authentication flow
}
