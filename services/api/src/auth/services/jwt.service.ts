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
 * JWT Token Pair Response (Access + Refresh)
 */
export interface JwtTokenPairResponse {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: number; // seconds
  refreshTokenExpiresIn: number; // seconds
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
  private readonly accessTokenExpiresIn: number;
  private readonly refreshTokenExpiresIn: number;

  constructor(
    private jwtService: NestJwtService,
    private configService: ConfigService,
  ) {
    // JWT expiration times from config or environment (parsed to seconds, minimum 5 min for access)
    this.accessTokenExpiresIn = this.parseExpirySeconds(
      this.configService.get<string | number>('JWT_EXPIRATION'),
      JWT_CONFIG.DEFAULT_EXPIRATION_SECONDS,
      300,
    );

    this.refreshTokenExpiresIn = this.parseExpirySeconds(
      this.configService.get<string | number>('JWT_REFRESH_EXPIRATION'),
      JWT_CONFIG.DEFAULT_REFRESH_EXPIRATION_SECONDS,
      60,
    );
  }

  /**
   * Parse expiry from env (e.g. 3600, "3600", "3600s", "1h") to seconds. Enforces minimum.
   */
  private parseExpirySeconds(
    value: string | number | undefined,
    defaultSeconds: number,
    minSeconds: number,
  ): number {
    if (value === undefined || value === null || value === '') {
      return defaultSeconds;
    }
    if (typeof value === 'number' && !Number.isNaN(value)) {
      return Math.max(minSeconds, value);
    }
    const s = String(value).trim().toLowerCase();
    const match = s.match(/^(\d+)(s|m|h|d)?$/);
    if (!match) {
      return defaultSeconds;
    }
    let sec = parseInt(match[1], 10);
    if (Number.isNaN(sec)) return defaultSeconds;
    const unit = match[2];
    if (unit === 'm') sec *= 60;
    else if (unit === 'h') sec *= 3600;
    else if (unit === 'd') sec *= 86400;
    return Math.max(minSeconds, sec);
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
      expiresIn: this.accessTokenExpiresIn,
    });

    this.logger.log(`JWT token generated for user ${userId} (${phone})`);

    return {
      token,
      expiresIn: this.accessTokenExpiresIn,
    };
  }

  /**
   * Generate JWT token pair (access + refresh)
   * @param userId - User ID
   * @param phone - Phone number
   * @param role - User role
   * @returns Access and refresh tokens with expiration info
   */
  generateTokenPair(
    userId: string,
    phone: string,
    role: UserRole,
  ): JwtTokenPairResponse {
    const payload: JwtPayload = {
      sub: userId,
      phone,
      role,
    };

    // Generate access token
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.accessTokenExpiresIn,
    });

    // Generate refresh token with longer expiration
    const refreshToken = this.jwtService.sign(
      { ...payload, type: 'refresh' },
      {
        expiresIn: this.refreshTokenExpiresIn,
      },
    );

    this.logger.log(`JWT token pair generated for user ${userId} (${phone})`);

    return {
      accessToken,
      refreshToken,
      accessTokenExpiresIn: this.accessTokenExpiresIn,
      refreshTokenExpiresIn: this.refreshTokenExpiresIn,
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
   * Verify refresh token specifically
   * @param token - Refresh token string
   * @returns Decoded payload or null if invalid/expired
   */
  verifyRefreshToken(token: string): JwtPayload | null {
    try {
      const payload = this.jwtService.verify<JwtPayload & { type?: string }>(token);

      // Ensure it's actually a refresh token
      if (payload.type !== 'refresh') {
        this.logger.warn('Token is not a refresh token');
        return null;
      }

      return payload;
    } catch (error) {
      this.logger.warn('Invalid refresh token:', error);
      return null;
    }
  }

  /**
   * Generate new access token from refresh token payload
   * @param refreshTokenPayload - Validated refresh token payload
   * @returns New access token response
   */
  generateAccessTokenFromRefresh(refreshTokenPayload: JwtPayload & { type?: string }): JwtTokenResponse {
    const { type, iat, exp, ...payload } = refreshTokenPayload; // Remove refresh-specific fields

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.accessTokenExpiresIn,
    });

    this.logger.log(`New access token generated for user ${payload.sub}`);

    return {
      token: accessToken,
      expiresIn: this.accessTokenExpiresIn,
    };
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
