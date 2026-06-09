import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { showToast } from '@/stores/toastStore';
import { useAuthStore } from '@/stores/authStore';
import type { Order } from '@/api/types';

export function usePendingPaymentCheck() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const alerted = useRef(false);

  const { data } = useQuery({
    queryKey: ['orders', 'pending-payment-check'],
    queryFn: () =>
      apiClient.get<Order[]>('/orders?status=active').then((r) => r.data),
    enabled: isAuthenticated,
    staleTime: 0,
  });

  useEffect(() => {
    if (alerted.current || !data) return;

    const pendingPaymentOrders = data.filter(
      (o) => o.status === 'PENDING_PAYMENT',
    );

    if (pendingPaymentOrders.length > 0) {
      alerted.current = true;
      showToast({
        type: 'warning',
        message: `You have ${pendingPaymentOrders.length} order${pendingPaymentOrders.length > 1 ? 's' : ''} with pending payment. Check My Orders.`,
      });
    }
  }, [data]);
}
