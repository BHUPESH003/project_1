import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPatch } from '@/api/client'
import { useAuthStore } from '@/stores/authStore'
import type { AppNotification, NotificationsPage } from '@/api/types'

const POLL_INTERVAL = 30_000 // 30 s — lightweight polling for unread badge

export function useUnreadCount() {
  const isAuthed = useAuthStore((s) => s.isAuthenticated)
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => apiGet<{ count: number }>('/notifications/unread-count'),
    enabled: isAuthed,
    refetchInterval: POLL_INTERVAL,
    staleTime: 15_000,
    select: (d) => d.count,
  })
}

export function useNotifications() {
  const isAuthed = useAuthStore((s) => s.isAuthenticated)
  return useInfiniteQuery({
    queryKey: ['notifications', 'inbox'],
    queryFn: ({ pageParam = 1 }) =>
      apiGet<NotificationsPage>('/notifications', { params: { page: pageParam, limit: 20 } }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
    enabled: isAuthed,
    staleTime: 15_000,
  })
}

export function useMarkAllRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => apiPatch('/notifications/read-all', {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

export function useMarkRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiPatch(`/notifications/${id}/read`, {}),
    onMutate: async (id) => {
      // Optimistically mark as read in cache
      await qc.cancelQueries({ queryKey: ['notifications', 'inbox'] })
      qc.setQueriesData<{ pages: NotificationsPage[] }>(
        { queryKey: ['notifications', 'inbox'] },
        (old) => {
          if (!old) return old
          return {
            ...old,
            pages: old.pages.map((p) => ({
              ...p,
              items: p.items.map((n: AppNotification) =>
                n.id === id ? { ...n, read: true } : n,
              ),
            })),
          }
        },
      )
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}
