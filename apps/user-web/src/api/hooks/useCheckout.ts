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
function normalizeCheckout(res: unknown): MultiCheckoutSummary {
  const recId = (r: unknown) =>
    (r && typeof r === 'object' ? (r as Record<string, unknown>).quotationId : r) as string | undefined
  const data = res as Record<string, unknown> | null
  const sellers = ((data?.sellers ?? []) as Record<string, unknown>[]).map((s) => ({
    ...s,
    deliveryOptions: ((s.deliveryOptions ?? []) as Record<string, unknown>[]).map((o) => {
      const v = (o.vehicleOptions as unknown[] | undefined)?.[0] as Record<string, unknown> | undefined
      const oRaw = o.raw as Record<string, unknown> | undefined
      return {
        quotationId: o.quotationId,
        deliveryPartnerId: o.providerId ?? o.deliveryPartnerId,
        providerName: o.providerId ?? o.providerName,
        displayName: o.providerName ?? o.displayName ?? o.providerId,
        feeRupees: v?.deliveryFeeRupees ?? o.feeRupees ?? oRaw?.quotedFeeRupees ?? 0,
        estimatedMinutes: v?.estimatedMinutes ?? o.estimatedMinutes ?? oRaw?.estimatedMinutes ?? 0,
        vehicleType: v?.vehicleType ?? o.vehicleType ?? 'standard',
      }
    }),
    recommendations: s.recommendations
      ? {
          cheapest: recId((s.recommendations as Record<string, unknown>).cheapest),
          fastest: recId((s.recommendations as Record<string, unknown>).fastest),
          recommended: recId((s.recommendations as Record<string, unknown>).recommended),
        }
      : undefined,
  }))
  return { ...(data ?? {}), sellers } as MultiCheckoutSummary
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
    // Cart is cleared by CartPage.pay() only after all payments are verified.
    // Clearing it here (on order creation) would wipe the cart before the user pays.
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.orders })
    },
  })
}

/**
 * POST /checkout/payment-intent — single consolidated payment intent for all orders.
 * One Razorpay modal for a multi-seller cart instead of one per shop.
 */
export async function createMultiPaymentIntent(
  orderIds: string[],
  payDeliveryFee?: boolean[],
): Promise<PaymentIntent> {
  const res = await apiPost<Record<string, unknown>>('/checkout/payment-intent', {
    orderIds,
    provider: 'razorpay',
    payDeliveryFee,
  })
  const paymentData =
    (res?.payment_intent as Record<string, unknown> | undefined)?.paymentData ??
    res?.paymentData ??
    res?.payment_intent ??
    res
  if (!(paymentData as Record<string, unknown> | undefined)?.keyId) {
    throw new Error('Payment could not be initialised (no gateway key)')
  }
  return { paymentData } as PaymentIntent
}

/**
 * Best-effort: cancel orders whose payment failed or was dismissed.
 * Orders are created before the Razorpay modal opens (SELLER_SELECTED state),
 * so a failed/dismissed payment must explicitly cancel them to avoid ghost orders.
 * Uses Promise.allSettled so a partial failure doesn't block the error path.
 */
export async function cancelOrdersAfterPaymentFailure(orderIds: string[]): Promise<void> {
  if (!orderIds.length) return
  await Promise.allSettled(
    orderIds.map((id) => apiPost(`/orders/${id}/cancel`, { reason: 'Payment failed or was cancelled' })),
  )
}

/** POST /checkout/verify-payment — settle all orders after a single Razorpay payment. */
export function verifyMultiPayment(
  orderIds: string[],
  result: RazorpayResult,
  payDeliveryFee?: boolean[],
): Promise<unknown> {
  return apiPost('/checkout/verify-payment', {
    orderIds,
    razorpay_payment_id: result.razorpay_payment_id,
    razorpay_order_id: result.razorpay_order_id,
    razorpay_signature: result.razorpay_signature,
    payDeliveryFee,
  })
}
