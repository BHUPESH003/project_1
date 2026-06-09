import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { Address, CreateAddressDto } from '@/api/types';

export function useAddresses() {
  return useQuery({
    queryKey: ['addresses'],
    queryFn: () =>
      apiClient.get<Address[]>('/users/me/addresses').then((r) => r.data),
  });
}

export function useCreateAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateAddressDto) =>
      apiClient
        .post<Address>('/users/me/addresses', dto)
        .then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['addresses'] }),
  });
}
