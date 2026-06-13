import { motion } from 'framer-motion'
import { money } from '@/lib/format'

/** Full-screen overlay shown while Razorpay handles the UPI flow. */
export function PaymentProcessing({ amount }: { amount: number }) {
  return (
    <div className="fixed inset-0 z-[120] mx-auto flex max-w-[430px] flex-col items-center justify-center gap-5 bg-bg/95 backdrop-blur-sm">
      <div className="relative grid h-24 w-24 place-items-center">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="absolute rounded-full border-2 border-primary"
            initial={{ width: 28, height: 28, opacity: 0.8 }}
            animate={{ width: 96, height: 96, opacity: 0 }}
            transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.5, ease: 'easeOut' }}
          />
        ))}
        <span className="h-7 w-7 rounded-full" style={{ background: 'var(--grad-primary)' }} />
      </div>
      <div className="text-center">
        <p className="text-title font-bold text-text">Completing your payment…</p>
        <p className="mt-1 text-subhead text-text-2 mono-num">{money(amount)} via UPI</p>
      </div>
      <p className="px-10 text-center text-caption text-text-3">
        Do not close this screen. Complete the payment in the popup.
      </p>
    </div>
  )
}
