import { colors } from './theme'
import type { PaymentIntent } from '@/api/types'

export interface RazorpayResult {
  razorpay_payment_id: string
  razorpay_order_id: string
  razorpay_signature: string
}

interface RazorpayCtor {
  new (options: Record<string, unknown>): { open: () => void; on: (ev: string, cb: (r: unknown) => void) => void }
}

/** Ensure the Razorpay checkout script is available (loaded in index.html). */
export function loadRazorpay(): Promise<RazorpayCtor> {
  return new Promise((resolve, reject) => {
    const w = window as unknown as { Razorpay?: RazorpayCtor }
    if (w.Razorpay) return resolve(w.Razorpay)
    const existing = document.querySelector<HTMLScriptElement>('script[src*="checkout.razorpay.com"]')
    const onLoad = () => (w.Razorpay ? resolve(w.Razorpay) : reject(new Error('Razorpay failed to load')))
    if (existing) {
      existing.addEventListener('load', onLoad)
      existing.addEventListener('error', () => reject(new Error('Razorpay failed to load')))
      return
    }
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = onLoad
    script.onerror = () => reject(new Error('Razorpay failed to load'))
    document.body.appendChild(script)
  })
}

/**
 * Open the Razorpay UPI checkout for one order. Resolves with the gateway
 * response on success; rejects if the user dismisses or payment fails.
 */
export async function openRazorpay(intent: PaymentIntent): Promise<RazorpayResult> {
  const Razorpay = await loadRazorpay()
  const pd = intent.paymentData
  return new Promise((resolve, reject) => {
    const rzp = new Razorpay({
      key: pd.keyId,
      amount: pd.amount,
      currency: pd.currency || 'INR',
      order_id: pd.orderId,
      prefill: pd.prefill,
      notes: pd.notes,
      theme: { color: colors.primary },
      handler: (response: unknown) => {
        const r = response as RazorpayResult
        if (r?.razorpay_payment_id) resolve(r)
        else reject(new Error('Payment incomplete'))
      },
      modal: {
        ondismiss: () => reject(new Error('Payment cancelled')),
      },
    })
    rzp.on('payment.failed', (resp: unknown) => {
      const desc = (resp as { error?: { description?: string } })?.error?.description
      reject(new Error(desc || 'Payment failed'))
    })
    rzp.open()
  })
}
