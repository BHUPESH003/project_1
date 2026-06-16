import { useMutation } from '@tanstack/react-query'
import { apiPost } from '@/api/client'
import type { VerifyOtpResponse } from '@/types/api'

/**
 * POST /auth/request-otp — sends an OTP for an ADMIN login. The role is
 * enforced server-side; after verify we additionally check user.role === ADMIN
 * before granting access (see OtpPage / RequireAdmin).
 */
export function useRequestOtp() {
  return useMutation({
    mutationFn: (phone: string) =>
      apiPost<{ expiresInSeconds?: number } | null>('/auth/request-otp', {
        phone,
        role: 'ADMIN',
      }),
  })
}

/** POST /auth/verify-otp — verifies the OTP and returns tokens + user. */
export function useVerifyOtp() {
  return useMutation({
    mutationFn: ({ phone, otp }: { phone: string; otp: string }) =>
      apiPost<VerifyOtpResponse>('/auth/verify-otp', { phone, otp }),
  })
}
