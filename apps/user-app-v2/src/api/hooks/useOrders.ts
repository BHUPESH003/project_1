import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { mapOrder } from '@/api/mappers';
import type { Order } from '@/api/types';

const ACTIVE_STATUSES = new Set([
  'CREATED',
  'SELLER_SELECTED',
  'CONFIRMED',
  'PREPARING',
  'READY_FOR_PICKUP',
  'OUT_FOR_DELIVERY',
]);

function toOrders(raw: unknown): Order[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(mapOrder);
}

export function useActiveOrders() {
  return useQuery({
    queryKey: ['orders', 'active'],
    queryFn: () =>
      apiClient.get<any>('/orders').then((r) =>
        toOrders(r.data).filter((o) => ACTIVE_STATUSES.has(o.status)),
      ),
    refetchInterval: 30_000,
  });
}

export function usePastOrders() {
  return useQuery({
    queryKey: ['orders', 'past'],
    queryFn: () =>
      apiClient.get<any>('/orders').then((r) =>
        toOrders(r.data).filter((o) => !ACTIVE_STATUSES.has(o.status)),
      ),
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: ['order', id],
    queryFn: () => apiClient.get<any>(`/orders/${id}`).then((r) => mapOrder(r.data)),
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
