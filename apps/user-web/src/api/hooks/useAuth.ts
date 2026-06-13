import { useMutation } from '@tanstack/react-query'
import { apiPost } from '@/api/client'
import type { VerifyOtpResponse } from '@/api/types'

/** POST /auth/request-otp — sends an OTP to the phone (E.164, +91…). */
export function useRequestOtp() {
  return useMutation({
    mutationFn: (phone: string) =>
      apiPost<{ expiresInSeconds?: number } | null>('/auth/request-otp', {
        phone,
        role: 'USER',
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
