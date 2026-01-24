import { Injectable, Logger } from '@nestjs/common';
import { UserRole } from '@repo/types';
import { OTP_CONFIG } from '@/constants';
import { OtpRepository } from '../repositories/otp.repository';

/**
 * OTP Service
 *
 * Handles OTP generation, storage, and verification.
 * This service is provider-agnostic and works with any OtpProvider.
 */
@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(private readonly otpRepository: OtpRepository) {}

  /**
   * Generate and store OTP for phone number
   * @param phone - Phone number in E.164 format
   * @param role - User role (USER, SELLER, ADMIN)
   * @returns Generated OTP code
   */
  async generateOtp(phone: string, role: UserRole): Promise<string> {
    // Generate OTP code using configured length
    const code = this.generateRandomCode(OTP_CONFIG.LENGTH);

    // Calculate expiry time using configured expiry minutes
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + OTP_CONFIG.EXPIRY_MINUTES);

    // Store OTP in database via repository
    await this.otpRepository.create({
      phone,
      code,
      role,
      expiresAt,
    });

    this.logger.log(`OTP generated for ${phone} (role: ${role})`);

    return code;
  }

  /**
   * Verify OTP code for phone number
   * @param phone - Phone number in E.164 format
   * @param code - OTP code to verify
   * @returns true if valid, false otherwise
   */
  async verifyOtp(phone: string, code: string): Promise<boolean> {
    // Find valid OTP via repository
    const otp = await this.otpRepository.findValidOtp(phone, code);

    if (!otp) {
      // Increment attempts if OTP exists but is invalid/expired
      await this.otpRepository.incrementAttempts(phone, code);

      this.logger.warn(`Invalid or expired OTP attempt for ${phone}`);
      return false;
    }

    // Mark OTP as verified via repository
    await this.otpRepository.markAsVerified(otp.id);

    this.logger.log(`OTP verified successfully for ${phone}`);

    return true;
  }

  /**
   * Clean up expired OTPs (can be called periodically)
   */
  async cleanupExpiredOtps(): Promise<void> {
    const count = await this.otpRepository.deleteExpired();

    if (count > 0) {
      this.logger.log(`Cleaned up ${count} expired OTPs`);
    }
  }

  /**
   * Generate random OTP code
   * @param length - Length of OTP code (default from config)
   * @returns OTP code string
   */
  private generateRandomCode(length: number = OTP_CONFIG.LENGTH): string {
    const min = Math.pow(10, length - 1);
    const max = Math.pow(10, length) - 1;
    return Math.floor(min + Math.random() * (max - min + 1)).toString();
  }
}
