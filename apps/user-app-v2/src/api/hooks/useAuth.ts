import { useMutation, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { AuthResponse, RequestOtpResponse, User } from '@/api/types';

type AuthRole = 'USER' | 'SELLER' | 'ADMIN';

// POST /auth/request-otp
export function useRequestOtp() {
  return useMutation({
    mutationFn: async (
      input: string | { phone: string; role?: AuthRole },
    ) => {
      const payload =
        typeof input === 'string'
          ? { phone: input, role: 'USER' as const }
          : { phone: input.phone, role: input.role ?? ('USER' as const) };

      const { data } = await apiClient.post<RequestOtpResponse>(
        '/auth/request-otp',
        payload,
      );
      return data;
    },
  });
}

// POST /auth/verify-otp
export function useVerifyOtp() {
  return useMutation({
    mutationFn: async ({ phone, otp }: { phone: string; otp: string }) => {
      const { data } = await apiClient.post<AuthResponse>('/auth/verify-otp', { phone, otp });
      return data;
    },
  });
}

// GET /users/me
export function useMe(enabled = true) {
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const { data } = await apiClient.get<User>('/users/me');
      return data;
    },
    enabled,
  });
}
