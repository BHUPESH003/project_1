/**
 * Auth API – backend contract v1.
 * POST /auth/request-otp, POST /auth/verify-otp, POST /auth/refresh-token.
 */

import client from './client';
import { unwrap, type ApiResponse } from './unwrap';

const AUTH_BASE = '/auth';

export interface RequestOtpResponse {
  success: boolean;
}

export interface VerifyOtpResponse {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: number;
  refreshTokenExpiresIn: number;
  user: {
    id: string;
    phone: string;
    role: string;
  };
}

export interface RefreshTokenResponse {
  accessToken: string;
  accessTokenExpiresIn: number;
  user: {
    id: string;
    phone: string;
    role: string;
  };
}

export const authApi = {
  /**
   * Request OTP – backend sends OTP via SMS.
   * Phone must be E.164 (e.g. +919876543210).
   */
  async requestOtp(phone: string, role: 'USER' | 'SELLER' | 'ADMIN' = 'USER'): Promise<RequestOtpResponse> {
    const res = await client.post<ApiResponse<RequestOtpResponse>>(`${AUTH_BASE}/request-otp`, {
      phone,
      role,
    });
    return unwrap(res);
  },

  /**
   * Verify OTP and receive auth tokens.
   */
  async verifyOtp(phone: string, otp: string): Promise<VerifyOtpResponse> {
    const res = await client.post<ApiResponse<VerifyOtpResponse>>(`${AUTH_BASE}/verify-otp`, {
      phone,
      otp,
    });
    return unwrap(res);
  },

  /**
   * Refresh access token. Backend returns accessToken only (no new refresh token).
   */
  async refreshToken(refreshToken: string): Promise<RefreshTokenResponse> {
    const res = await client.post<ApiResponse<RefreshTokenResponse>>(`${AUTH_BASE}/refresh-token`, {
      refreshToken,
    });
    return unwrap(res);
  },
};
