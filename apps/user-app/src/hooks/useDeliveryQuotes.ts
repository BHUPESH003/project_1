/**
 * Hook for managing delivery flow - fetch quotes and select provider
 */
import { useQuery } from '@tanstack/react-query';
import { ordersApi, type DeliveryQuotesResponse } from '@/api/orders.api';

export interface DeliveryLocation {
  lat: number;
  lng: number;
  address?: string;
}

export function useDeliveryQuotes(orderId: string | null, location: DeliveryLocation | null) {
  return useQuery({
    queryKey: ['deliveryQuotes', orderId, location?.lat, location?.lng],
    queryFn: () => {
      if (!orderId || !location) throw new Error('Order ID and location required');
      return ordersApi.getAllDeliveryQuotes(orderId, location);
    },
    enabled: !!orderId && !!location,
  });
}
