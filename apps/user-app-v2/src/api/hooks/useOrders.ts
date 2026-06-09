import { useQuery, useMutation, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { Order, PaginatedOrders } from '@/api/types';

export function useActiveOrders() {
  return useQuery({
    queryKey: ['orders', 'active'],
    queryFn: () =>
      apiClient.get<Order[]>('/orders?status=active').then((r) => r.data),
    refetchInterval: 30_000,
  });
}

export function usePastOrders() {
  return useInfiniteQuery({
    queryKey: ['orders', 'past'],
    queryFn: ({ pageParam = 1 }) =>
      apiClient
        .get<PaginatedOrders>(`/orders?status=past&page=${pageParam}`)
        .then((r) => r.data),
    getNextPageParam: (last) => (last.hasNextPage ? last.page + 1 : undefined),
    initialPageParam: 1,
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: ['order', id],
    queryFn: () => apiClient.get<Order>(`/orders/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCancelOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) =>
      apiClient.post(`/orders/${orderId}/cancel`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}
