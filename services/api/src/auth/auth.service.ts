import {
  Injectable,
  Logger,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { UserRole } from '@repo/types';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { OtpProviderRegistry } from './providers/registry/otp-provider.registry';
import { OtpService } from './services/otp.service';
import { JwtService } from './services/jwt.service';
import { UserRepository } from '@/users/repositories/user.repository';

/**
 * Auth Service
 *
 * Handles OTP-based authentication.
 * Uses abstracted OTP provider (Twilio, AWS SNS, etc.) via OtpProviderRegistry.
 * No provider-specific logic - fully abstracted.
 *
 * @see OTP_ARCHITECTURE.md for design requirements
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private otpProviderRegistry: OtpProviderRegistry,
    private otpService: OtpService,
    private jwtService: JwtService,
    private userRepository: UserRepository,
  ) {}

  /**
   * Request OTP for phone number
   * @param dto - RequestOtpDto containing phone and role
   * @returns Success response (will be wrapped by TransformInterceptor)
   */
  async requestOtp(dto: RequestOtpDto): Promise<{ success: boolean }> {
    // Generate OTP code
    const code = await this.otpService.generateOtp(dto.phone, dto.role);

    // Get OTP provider (abstracted - no provider-specific logic)
    const provider = this.otpProviderRegistry.getProvider();

    // Send OTP via provider
    const result = await provider.sendOtp(dto.phone, code);

    if (!result.success) {
      this.logger.error(`Failed to send OTP to ${dto.phone}: ${result.error}`);
      throw new BadRequestException(
        result.error || 'Failed to send OTP. Please try again.',
      );
    }

    this.logger.log(
      `OTP sent successfully to ${dto.phone} via ${provider.getName()}`,
    );

    // In production, don't expose that OTP was sent (security)
    // In development, you might want to log the code for testing
    if (process.env.NODE_ENV === 'development') {
      this.logger.debug(`[DEV] OTP code for ${dto.phone}: ${code}`);
    }

    // Return data - TransformInterceptor will wrap in standard format
    return { success: true };
  }

  /**
   * Verify OTP and return JWT token
   * @param dto - VerifyOtpDto containing phone and OTP code
   * @returns JWT token and user info
   */
  async verifyOtp(dto: VerifyOtpDto): Promise<{
    token: string;
    expiresIn: number;
    user: {
      id: string;
      phone: string;
      role: UserRole;
    };
  }> {
    // Verify OTP code
    const isValid = await this.otpService.verifyOtp(dto.phone, dto.otp);

    if (!isValid) {
      throw new UnauthorizedException('Invalid or expired OTP code');
    }

    // Find or create user via repository
    let user = await this.userRepository.findByPhone(dto.phone);

    if (!user) {
      // Create new user (role will be determined from the OTP request, but for now use USER)
      user = await this.userRepository.create({
        phone: dto.phone,
        role: UserRole.USER, // Default role, can be updated based on business logic
        name: null, // Name can be set later
      });
      this.logger.log(`New user created: ${user.id} (${dto.phone})`);
    }

    // Generate JWT token
    const tokenResponse = this.jwtService.generateToken(
      user.id,
      user.phone,
      user.role,
    );

    this.logger.log(`User authenticated: ${user.id} (${dto.phone})`);

    return {
      token: tokenResponse.token,
      expiresIn: tokenResponse.expiresIn,
      user: {
        id: user.id,
        phone: user.phone,
        role: user.role,
      },
    };
  }
}
