import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { mapFavorite, mapUser } from '@/api/mappers';
import type {
  User,
  Seller,
  UpdateUserDto,
  NotificationPreferences,
} from '@/api/types';

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateUserDto) => {
      // Backend does not accept fcmToken — strip it to avoid 400
      const { fcmToken: _stripped, ...safe } = data as UpdateUserDto & { fcmToken?: string };
      return apiClient.patch<any>('/users/me', safe).then((r) => mapUser(r.data));
    },
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
    mutationFn: (data: Partial<NotificationPreferences>) => {
      // Backend DTO does not include newSellers — strip to avoid 400
      const { newSellers: _stripped, ...safe } = data as Partial<NotificationPreferences> & { newSellers?: boolean };
      return apiClient
        .patch<NotificationPreferences>('/users/me/notification-preferences', safe)
        .then((r) => r.data);
    },
    onSuccess: (data) => qc.setQueryData(['notification-prefs'], data),
  });
}

export function useFavorites() {
  return useQuery({
    queryKey: ['favorites'],
    queryFn: () =>
      apiClient
        .get<any[]>('/favorites')
        .then((r) => (Array.isArray(r.data) ? r.data.map(mapFavorite) : [])),
  });
}

export function useRemoveFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sellerId: string) => apiClient.delete(`/favorites/${sellerId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['favorites'] }),
  });
}
