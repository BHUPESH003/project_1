import { Injectable } from '@nestjs/common';
import { UserRole } from '@repo/types';
import { PrismaService } from '@/prisma/prisma.service';

/**
 * OTP Entity Type
 */
export interface OtpEntity {
  id: string;
  phone: string;
  code: string;
  role: UserRole;
  expiresAt: Date;
  verified: boolean;
  attempts: number;
  userId: string | null;
  createdAt: Date;
}

/**
 * OTP Repository
 *
 * Handles all database operations for OTP entity.
 * Abstracts Prisma-specific queries from services.
 */
@Injectable()
export class OtpRepository {
  constructor(private readonly prismaService: PrismaService) {}

  /**
   * Create new OTP record
   */
  async create(data: {
    phone: string;
    code: string;
    role: UserRole;
    expiresAt: Date;
    userId?: string | null;
  }): Promise<OtpEntity> {
    const otp = await this.prismaService.prisma.otp.create({
      data: {
        phone: data.phone,
        code: data.code,
        role: data.role as unknown as UserRole, // Map to Prisma enum
        expiresAt: data.expiresAt,
        userId: data.userId ?? null,
        verified: false,
        attempts: 0,
      },
    });
    return this.mapToEntity(otp);
  }

  /**
   * Find valid OTP by phone and code
   * Returns the most recent non-expired, non-verified OTP
   */
  async findValidOtp(phone: string, code: string): Promise<OtpEntity | null> {
    const otp = await this.prismaService.prisma.otp.findFirst({
      where: {
        phone,
        code,
        expiresAt: {
          gte: new Date(), // Not expired
        },
        verified: false, // Not already verified
      },
      orderBy: {
        createdAt: 'desc', // Most recent first
      },
    });
    return otp ? this.mapToEntity(otp) : null;
  }

  /**
   * Find the most recent OTP record for a phone, regardless of code/verified
   * state. Used by the OTP-bypass flow to recover the role requested at
   * /auth/request-otp without matching on the actual code.
   */
  async findLatestByPhone(phone: string): Promise<OtpEntity | null> {
    const otp = await this.prismaService.prisma.otp.findFirst({
      where: { phone },
      orderBy: { createdAt: 'desc' },
    });
    return otp ? this.mapToEntity(otp) : null;
  }

  /**
   * Mark OTP as verified
   */
  async markAsVerified(id: string): Promise<OtpEntity> {
    const otp = await this.prismaService.prisma.otp.update({
      where: { id },
      data: { verified: true },
    });
    return this.mapToEntity(otp);
  }

  /**
   * Map Prisma OTP to OtpEntity
   * Converts Prisma enum to our custom enum type
   */
  private mapToEntity(otp: {
    id: string;
    phone: string;
    code: string;
    role: unknown;
    expiresAt: Date;
    verified: boolean;
    attempts: number;
    userId: string | null;
    createdAt: Date;
  }): OtpEntity {
    return {
      ...otp,
      role: otp.role as UserRole, // Type assertion for enum compatibility
    };
  }

  /**
   * Increment failed attempts for OTP
   */
  async incrementAttempts(phone: string, code: string): Promise<void> {
    await this.prismaService.prisma.otp.updateMany({
      where: {
        phone,
        code,
        verified: false,
      },
      data: {
        attempts: {
          increment: 1,
        },
      },
    });
  }

  /**
   * Clean up expired OTPs
   */
  async deleteExpired(): Promise<number> {
    const result = await this.prismaService.prisma.otp.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
    return result.count;
  }
}
