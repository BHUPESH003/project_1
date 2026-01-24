import { Injectable, Logger } from '@nestjs/common';
import { JwtService as NestJwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@repo/types';
import { JWT_CONFIG, getConfigValue } from '@/constants';

/**
 * JWT Payload interface
 */
export interface JwtPayload {
  sub: string; // User ID
  phone: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

/**
 * JWT Token Response
 */
export interface JwtTokenResponse {
  token: string;
  expiresIn: number; // seconds
}

/**
 * JWT Service
 *
 * Handles JWT token generation and validation.
 * Uses NestJS JWT module for token operations.
 */
@Injectable()
export class JwtService {
  private readonly logger = new Logger(JwtService.name);
  private readonly expiresIn: number;

  constructor(
    private jwtService: NestJwtService,
    private configService: ConfigService,
  ) {
    // JWT expiration time from config or environment
    this.expiresIn = getConfigValue<number>(
      this.configService,
      'JWT_EXPIRATION',
      JWT_CONFIG.DEFAULT_EXPIRATION_SECONDS,
    );
  }

  /**
   * Generate JWT token for user
   * @param userId - User ID
   * @param phone - Phone number
   * @param role - User role
   * @returns JWT token and expiration info
   */
  generateToken(
    userId: string,
    phone: string,
    role: UserRole,
  ): JwtTokenResponse {
    const payload: JwtPayload = {
      sub: userId,
      phone,
      role,
    };

    const token = this.jwtService.sign(payload, {
      expiresIn: this.expiresIn,
    });

    this.logger.log(`JWT token generated for user ${userId} (${phone})`);

    return {
      token,
      expiresIn: this.expiresIn,
    };
  }

  /**
   * Verify and decode JWT token
   * @param token - JWT token string
   * @returns Decoded payload or null if invalid
   */
  verifyToken(token: string): JwtPayload | null {
    try {
      const payload = this.jwtService.verify<JwtPayload>(token);
      return payload;
    } catch (error) {
      this.logger.warn('Invalid JWT token:', error);
      return null;
    }
  }

  /**
   * Decode JWT token without verification (for inspection)
   * @param token - JWT token string
   * @returns Decoded payload or null
   */
  decodeToken(token: string): JwtPayload | null {
    try {
      return this.jwtService.decode<JwtPayload>(token);
    } catch (error) {
      this.logger.warn('Failed to decode JWT token:', error);
      return null;
    }
  }
}
