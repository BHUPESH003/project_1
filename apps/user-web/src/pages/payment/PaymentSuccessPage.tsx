import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Check, ChevronRight, Receipt } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { qk } from '@/lib/constants'
import { money } from '@/lib/format'

export function PaymentSuccessPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const qc = useQueryClient()
  const state = location.state as { orderIds?: string[]; amount?: number } | null
  const orderIds = state?.orderIds ?? []

  // Cart was cleared server-side on order placement — refresh local caches.
  useEffect(() => {
    qc.invalidateQueries({ queryKey: qk.cart })
    qc.invalidateQueries({ queryKey: qk.orders })
  }, [qc])

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 pb-10 text-center">
      <motion.div
        initial={{ scale: 0, rotate: -30 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 18 }}
        className="grid h-24 w-24 place-items-center rounded-full text-white"
        style={{ background: 'var(--grad-success)' }}
      >
        <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring' }}>
          <Check size={48} strokeWidth={3} />
        </motion.span>
      </motion.div>

      <h1 className="mt-6 text-display font-extrabold text-text">Payment successful!</h1>
      {state?.amount != null && (
        <p className="mt-1 text-title-lg font-bold text-success mono-num">{money(state.amount)} paid</p>
      )}

      {orderIds.length > 0 && (
        <div className="mt-6 w-full space-y-2">
          {orderIds.map((id, i) => (
            <button
              key={id}
              onClick={() => navigate(`/orders/${id}`)}
              className="flex w-full items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3 text-left"
            >
              <span className="grid h-10 w-10 place-items-center rounded-full bg-primary-soft text-primary">
                <Receipt size={18} />
              </span>
              <span className="flex-1">
                <span className="block text-subhead font-semibold text-text">Order #{id.slice(-6).toUpperCase()}</span>
                <span className="block text-caption text-text-2">Order {i + 1} of {orderIds.length}</span>
              </span>
              <ChevronRight size={18} className="text-text-3" />
            </button>
          ))}
        </div>
      )}

      <div className="mt-8 w-full space-y-2.5">
        <Button full size="lg" onClick={() => navigate('/orders', { replace: true })}>
          Track your orders
        </Button>
        <Button full variant="ghost" onClick={() => navigate('/', { replace: true })}>
          Continue shopping
        </Button>
      </div>
    </div>
  )
}
