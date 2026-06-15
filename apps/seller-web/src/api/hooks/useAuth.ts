import { useMutation } from '@tanstack/react-query'
import { apiPost } from '@/api/client'
import type { VerifyOtpResponse } from '@/types/api'

/**
 * POST /auth/request-otp — sends an OTP for a SELLER login.
 * The role is honoured server-side: a brand-new phone becomes a SELLER, and an
 * existing plain USER is upgraded to SELLER on verify (see auth.service.ts).
 */
export function useRequestOtp() {
  return useMutation({
    mutationFn: (phone: string) =>
      apiPost<{ expiresInSeconds?: number } | null>('/auth/request-otp', {
        phone,
        role: 'SELLER',
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
