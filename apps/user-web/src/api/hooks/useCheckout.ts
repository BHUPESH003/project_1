import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost } from '@/api/client'
import { qk } from '@/lib/constants'
import type { MultiCheckoutSummary, PaymentIntent, PlaceMultiOrderInput } from '@/api/types'
import type { RazorpayResult } from '@/lib/razorpay'

/**
 * place-order/multi returns `{ orders: [{ order_id, status }], count }`.
 * Older/alt shapes (`orderIds`, `order_ids`, bare array) are tolerated.
 */
function extractOrderIds(res: unknown): string[] {
  if (!res) return []
  if (Array.isArray(res)) return res.map((o) => (typeof o === 'string' ? o : o?.order_id ?? o?.id)).filter(Boolean)
  const r = res as Record<string, unknown>
  if (Array.isArray(r.orders)) {
    return (r.orders as Record<string, unknown>[]).map((o) => (o.order_id ?? o.id) as string).filter(Boolean)
  }
  if (Array.isArray(r.orderIds)) return r.orderIds as string[]
  if (Array.isArray(r.order_ids)) return r.order_ids as string[]
  return []
}

/**
 * The backend nests each delivery option's fee under
 * `vehicleOptions[0].deliveryFeeRupees` and returns `recommendations` as full
 * quotation OBJECTS. The UI expects flat options (`feeRupees`, `estimatedMinutes`,
 * `displayName`) and recommendations as quotationId strings. Normalise here —
 * otherwise every fee renders as ₹0 and the Recommended/Cheapest/Fastest badges
 * never match.
 */
function normalizeCheckout(res: any): MultiCheckoutSummary {
  const recId = (r: any) => (r && typeof r === 'object' ? r.quotationId : r) as string | undefined
  const sellers = (res?.sellers ?? []).map((s: any) => ({
    ...s,
    deliveryOptions: (s.deliveryOptions ?? []).map((o: any) => {
      const v = o.vehicleOptions?.[0]
      return {
        quotationId: o.quotationId,
        deliveryPartnerId: o.providerId ?? o.deliveryPartnerId,
        providerName: o.providerId ?? o.providerName,
        displayName: o.providerName ?? o.displayName ?? o.providerId,
        feeRupees: v?.deliveryFeeRupees ?? o.feeRupees ?? o.raw?.quotedFeeRupees ?? 0,
        estimatedMinutes: v?.estimatedMinutes ?? o.estimatedMinutes ?? o.raw?.estimatedMinutes ?? 0,
        vehicleType: v?.vehicleType ?? o.vehicleType ?? 'standard',
      }
    }),
    recommendations: s.recommendations
      ? {
          cheapest: recId(s.recommendations.cheapest),
          fastest: recId(s.recommendations.fastest),
          recommended: recId(s.recommendations.recommended),
        }
      : undefined,
  }))
  return { ...res, sellers } as MultiCheckoutSummary
}

/** GET /checkout/multi?deliveryAddressId — per-seller summaries + delivery options. */
export function useMultiCheckout(deliveryAddressId: string | undefined) {
  return useQuery({
    queryKey: deliveryAddressId ? qk.checkout(deliveryAddressId) : ['checkout', 'multi', 'none'],
    queryFn: async () => normalizeCheckout(await apiGet<unknown>('/checkout/multi', { params: { deliveryAddressId } })),
    enabled: !!deliveryAddressId,
    staleTime: 15_000,
  })
}

/** POST /checkout/place-order/multi — creates one order per seller; returns order ids. */
export function usePlaceMultiOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: PlaceMultiOrderInput): Promise<string[]> => {
      const res = await apiPost<unknown>('/checkout/place-order/multi', input)
      return extractOrderIds(res)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.cart })
      qc.invalidateQueries({ queryKey: qk.orders })
    },
  })
}

/**
 * POST /orders/:id/create-payment-intent?provider=razorpay
 * Backend returns `{ payment_id, order_id, amount, status, payment_intent: {
 * gatewayOrderId, paymentData: { keyId, orderId, amount(paise), currency,
 * prefill } } }`. openRazorpay() wants `{ paymentData }`, so extract it.
 */
export async function createPaymentIntent(orderId: string): Promise<PaymentIntent> {
  const res = await apiPost<Record<string, any>>(
    `/orders/${orderId}/create-payment-intent`,
    undefined,
    { params: { provider: 'razorpay' } },
  )
  const paymentData =
    res?.payment_intent?.paymentData ?? res?.paymentData ?? res?.payment_intent ?? res
  if (!paymentData?.keyId) {
    throw new Error('Payment could not be initialised (no gateway key)')
  }
  return { paymentData } as PaymentIntent
}

/** POST /orders/:id/verify-payment */
export function verifyPayment(orderId: string, result: RazorpayResult): Promise<unknown> {
  return apiPost(`/orders/${orderId}/verify-payment`, {
    razorpay_payment_id: result.razorpay_payment_id,
    razorpay_order_id: result.razorpay_order_id,
    razorpay_signature: result.razorpay_signature,
  })
}
