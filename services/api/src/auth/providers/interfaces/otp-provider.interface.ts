/**
 * OTP Provider Interface
 *
 * This interface defines the contract for all OTP providers.
 * All providers (Twilio, AWS SNS, etc.) must implement this interface.
 *
 * @see OTP_ARCHITECTURE.md for complete design requirements
 */

export enum OtpProviderType {
  TWILIO = 'TWILIO',
  AWS_SNS = 'AWS_SNS',
  // Add new providers here
}

export interface OtpResult {
  success: boolean;
  messageId?: string; // Optional provider-specific message ID
  error?: string; // Error message if failed
}

/**
 * OTP Provider Interface
 *
 * All OTP providers must implement this interface.
 * This ensures the AuthService can work with any provider
 * without knowing the implementation details.
 */
export interface OtpProvider {
  /**
   * Send OTP code to phone number
   * @param phone - Phone number in E.164 format (e.g., +919876543210)
   * @param code - OTP code to send (6 digits)
   * @returns Promise resolving to OtpResult
   */
  sendOtp(phone: string, code: string): Promise<OtpResult>;

  /**
   * Get provider name/type
   * @returns OtpProviderType enum value
   */
  getName(): OtpProviderType;
}
