import {
  Injectable,
  Logger,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
    private configService: ConfigService,
  ) {}

  /**
   * Fixed OTP code accepted when the bypass flag is enabled.
   */
  private static readonly BYPASS_OTP_CODE = '123456';

  /**
   * Whether the global OTP bypass is enabled (useful if the OTP provider is
   * expired or for dev/QA). Controlled by the BYPASS_OTP env var.
   */
  private isOtpBypassEnabled(): boolean {
    return (
      this.configService.get<boolean>('BYPASS_OTP', false) ||
      this.configService.get<string>('BYPASS_OTP') === 'true'
    );
  }

  /**
   * Request OTP for phone number
   * @param dto - RequestOtpDto containing phone and role
   * @returns Success response (will be wrapped by TransformInterceptor)
   */
  async requestOtp(dto: RequestOtpDto): Promise<{ success: boolean }> {
    // Generate OTP code
    const code = await this.otpService.generateOtp(dto.phone, dto.role);

    // Check for global OTP bypass (useful if service is expired or for dev)
    if (this.isOtpBypassEnabled()) {
      this.logger.warn(
        `[BYPASS] OTP for ${dto.phone}: ${code}. Skipping OTP provider send.`,
      );
      return { success: true };
    }

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
   * Verify OTP and return JWT token pair
   * @param dto - VerifyOtpDto containing phone and OTP code
   * @returns JWT access token, refresh token, and user info
   */
  async verifyOtp(dto: VerifyOtpDto): Promise<{
    accessToken: string;
    refreshToken: string;
    accessTokenExpiresIn: number;
    refreshTokenExpiresIn: number;
    user: {
      id: string;
      phone: string;
      role: UserRole;
    };
  }> {
    // When the global bypass is enabled, accept the fixed bypass code without
    // matching the real OTP. We still read the latest OTP record (if any) to
    // recover the role requested at /auth/request-otp.
    const isBypass =
      this.isOtpBypassEnabled() && dto.otp === AuthService.BYPASS_OTP_CODE;

    const otp = isBypass
      ? await this.otpService.getLatestOtp(dto.phone)
      : await this.otpService.verifyOtp(dto.phone, dto.otp);

    if (isBypass) {
      this.logger.warn(`[BYPASS] OTP verification bypassed for ${dto.phone}`);
    } else if (!otp) {
      throw new UnauthorizedException('Invalid or expired OTP code');
    }

    // The role requested at /auth/request-otp is stored on the OTP record.
    // Honour it so sellers/admins land in the right role. Never downgrade an
    // existing privileged account back to USER (e.g. an ADMIN logging in via a
    // USER-role OTP keeps ADMIN).
    const requestedRole = otp?.role ?? UserRole.USER;

    // Find or create user via repository
    let user = await this.userRepository.findByPhone(dto.phone);

    if (!user) {
      // New user: created with the role they requested an OTP for.
      user = await this.userRepository.create({
        phone: dto.phone,
        role: requestedRole,
        name: null, // Name can be set later
      });
      this.logger.log(
        `New user created: ${user.id} (${dto.phone}) as ${user.role}`,
      );
    } else if (
      requestedRole !== UserRole.USER &&
      user.role !== requestedRole &&
      user.role === UserRole.USER
    ) {
      // Existing plain USER upgrading to SELLER/ADMIN (e.g. a customer who now
      // wants to sell). Only ever upgrade away from USER — never downgrade.
      user = await this.userRepository.update(user.id, { role: requestedRole });
      this.logger.log(`User ${user.id} role upgraded to ${user.role}`);
    }

    // Generate JWT token pair (access + refresh)
    const tokenResponse = this.jwtService.generateTokenPair(
      user.id,
      user.phone,
      user.role,
    );

    this.logger.log(`User authenticated: ${user.id} (${dto.phone})`);

    return {
      accessToken: tokenResponse.accessToken,
      refreshToken: tokenResponse.refreshToken,
      accessTokenExpiresIn: tokenResponse.accessTokenExpiresIn,
      refreshTokenExpiresIn: tokenResponse.refreshTokenExpiresIn,
      user: {
        id: user.id,
        phone: user.phone,
        role: user.role,
      },
    };
  }

  /**
   * Refresh access token using refresh token
   * @param refreshToken - Valid refresh token
   * @returns New access token and expiration info
   */
  async refreshToken(refreshToken: string): Promise<{
    accessToken: string;
    accessTokenExpiresIn: number;
    user: {
      id: string;
      phone: string;
      role: UserRole;
    };
  }> {
    // Verify refresh token
    const payload = this.jwtService.verifyRefreshToken(refreshToken);

    if (!payload) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Verify user still exists
    const user = await this.userRepository.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Generate new access token
    const newAccessToken =
      this.jwtService.generateAccessTokenFromRefresh(payload);

    this.logger.log(
      `Access token refreshed for user ${user.id} (${user.phone})`,
    );

    return {
      accessToken: newAccessToken.token,
      accessTokenExpiresIn: newAccessToken.expiresIn,
      user: {
        id: user.id,
        phone: user.phone,
        role: user.role,
      },
    };
  }
}
