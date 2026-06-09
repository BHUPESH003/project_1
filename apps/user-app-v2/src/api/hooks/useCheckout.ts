import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type {
  CheckoutSummary,
  PlaceOrderPayload,
  MultiOrderResponse,
  PaymentIntent,
  VerifyPaymentPayload,
  Order,
  PresignedUrlRequest,
  PresignedUrlResponse,
  UploadedFile,
} from '@/api/types';

export function useCheckoutSummary(addressId: string | undefined) {
  return useQuery({
    queryKey: ['checkout', 'summary', addressId],
    queryFn: () =>
      apiClient
        .get<CheckoutSummary>('/checkout/multi', {
          params: { deliveryAddressId: addressId },
        })
        .then((r) => r.data),
    enabled: Boolean(addressId),
    staleTime: 30_000,
  });
}

export function usePlaceOrder() {
  return useMutation({
    mutationFn: (payload: PlaceOrderPayload) =>
      apiClient
        .post<MultiOrderResponse>('/checkout/place-order/multi', payload)
        .then((r) => r.data),
  });
}

export function useCreatePaymentIntent() {
  return useMutation({
    mutationFn: (orderId: string) =>
      apiClient
        .post<PaymentIntent>(`/orders/${orderId}/create-payment-intent`)
        .then((r) => r.data),
  });
}

export function useVerifyPayment() {
  return useMutation({
    mutationFn: ({
      orderId,
      payload,
    }: {
      orderId: string;
      payload: VerifyPaymentPayload;
    }) =>
      apiClient
        .post<Order>(`/orders/${orderId}/verify-payment`, payload)
        .then((r) => r.data),
  });
}

export function usePresignedUrl() {
  return useMutation({
    mutationFn: (req: PresignedUrlRequest) =>
      apiClient
        .post<PresignedUrlResponse>('/files/presigned-url', req)
        .then((r) => r.data),
  });
}

export function useValidateFile() {
  return useMutation({
    mutationFn: (key: string) =>
      apiClient
        .post<UploadedFile>('/files/validate', { key })
        .then((r) => r.data),
  });
}
