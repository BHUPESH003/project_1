import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type {
  User,
  Seller,
  UpdateUserDto,
  NotificationPreferences,
} from '@/api/types';

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateUserDto) =>
      apiClient.patch<User>('/users/me', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me'] }),
  });
}

export function useDeleteAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/users/me/addresses/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['addresses'] }),
  });
}

export function useNotificationPreferences() {
  return useQuery({
    queryKey: ['notification-prefs'],
    queryFn: () =>
      apiClient
        .get<NotificationPreferences>('/users/me/notification-preferences')
        .then((r) => r.data),
  });
}

export function useUpdateNotificationPreferences() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<NotificationPreferences>) =>
      apiClient
        .patch<NotificationPreferences>('/users/me/notification-preferences', data)
        .then((r) => r.data),
    onSuccess: (data) => qc.setQueryData(['notification-prefs'], data),
  });
}

export function useFavorites() {
  return useQuery({
    queryKey: ['favorites'],
    queryFn: () => apiClient.get<Seller[]>('/favorites').then((r) => r.data),
  });
}

export function useRemoveFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sellerId: string) => apiClient.delete(`/favorites/${sellerId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['favorites'] }),
  });
}
