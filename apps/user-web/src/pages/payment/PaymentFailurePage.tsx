import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export function PaymentFailurePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const reason = (location.state as { reason?: string } | null)?.reason

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 pb-10 text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1, x: [0, -8, 8, -6, 6, 0] }}
        transition={{ scale: { type: 'spring', stiffness: 260, damping: 18 }, x: { delay: 0.2, duration: 0.4 } }}
        className="grid h-24 w-24 place-items-center rounded-full bg-danger-soft text-danger"
      >
        <X size={48} strokeWidth={3} />
      </motion.div>

      <h1 className="mt-6 text-display font-extrabold text-text">Payment didn&apos;t go through</h1>
      {reason && <p className="mt-2 text-subhead text-text-2">{reason}</p>}
      <p className="mt-2 text-subhead text-text-3">Don&apos;t worry — no amount was deducted.</p>

      <div className="mt-8 w-full space-y-2.5">
        <Button full size="lg" onClick={() => navigate('/cart', { replace: true })}>
          Retry payment
        </Button>
        <Button full variant="ghost" onClick={() => navigate('/orders', { replace: true })}>
          View orders
        </Button>
      </div>
    </div>
  )
}
