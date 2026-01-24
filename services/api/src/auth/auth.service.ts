import { Injectable } from '@nestjs/common';

@Injectable()
export class AuthService {
  requestOtp(requestOtpDto: Record<string, unknown>) {
    // TODO: Send OTP to phone number
    // Expected payload: { phone: "+91XXXXXXXXXX", role: "USER | SELLER" }
    return { message: 'Request OTP - to be implemented' };
  }

  verifyOtp(verifyOtpDto: Record<string, unknown>) {
    // TODO: Verify OTP and return JWT token
    // Expected payload: { phone: "+91XXXXXXXXXX", otp: "123456" }
    // Expected response: { token: "jwt_token", user: { id, role } }
    return { message: 'Verify OTP - to be implemented' };
  }
}
