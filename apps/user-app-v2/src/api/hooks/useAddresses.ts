import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { mapAddress, toCreateAddressPayload } from '@/api/mappers';
import type { Address, CreateAddressDto } from '@/api/types';

export function useAddresses() {
  return useQuery({
    queryKey: ['addresses'],
    queryFn: () =>
      apiClient
        .get<any[]>('/users/me/addresses')
        .then((r) => (Array.isArray(r.data) ? r.data.map(mapAddress) : [])),
  });
}

export function useCreateAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateAddressDto) =>
      apiClient
        .post<any>('/users/me/addresses', toCreateAddressPayload(dto))
        .then((r) => mapAddress(r.data)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['addresses'] }),
  });
}
