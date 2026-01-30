/**
 * Auth API endpoints
 * Phone login, OTP verification, token refresh
 */

import client from './client';

interface LoginResponse {
  requestId: string;
  expiresIn: number;
}

interface VerifyOtpResponse {
  token: string;
  refreshToken: string;
  user: {
    id: string;
    phoneNumber: string;
    name?: string;
  };
}

export const authApi = {
  /**
   * Initiate phone login
   * Backend sends OTP via SMS
   */
  async login(phoneNumber: string): Promise<LoginResponse> {
    const { data } = await client.post('/auth/login', {
      phoneNumber,
    });
    return data;
  },

  /**
   * Verify OTP and get auth token
   */
  async verifyOtp(phoneNumber: string, otp: string): Promise<VerifyOtpResponse> {
    const { data } = await client.post('/auth/verify-otp', {
      phoneNumber,
      otp,
    });
    return data;
  },

  /**
   * Refresh token when expired
   */
  async refreshToken(refreshToken: string): Promise<{ token: string }> {
    const { data } = await client.post('/auth/refresh', {
      refreshToken,
    });
    return data;
  },

  /**
   * Logout - invalidate token server-side
   */
  async logout(): Promise<void> {
    await client.post('/auth/logout');
  },
};
