import { useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ShoppingCart, ChevronRight } from 'lucide-react'
import { useCart, groupBySeller } from '@/api/hooks/useCart'
import { toNum, money } from '@/lib/format'

/** Persistent cart summary bar; hidden on cart/checkout/payment routes. */
export function FloatingCartBar() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { data: cart } = useCart()

  const hiddenRoutes = ['/cart', '/checkout', '/payment']
  const hidden = hiddenRoutes.some((r) => pathname.startsWith(r))

  const count = cart?.items.reduce((s, it) => s + (it.quantity || 1), 0) ?? 0
  const groups = groupBySeller(cart)
  const total = groups.reduce((s, g) => s + toNum(g.subtotal), 0)
  const show = count > 0 && !hidden

  return (
    // Fixed wrapper keeps the bar floating in the viewport (above the nav) while
    // scrolling, centered within the app frame; the button animates inside it.
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--bottom-nav-h)_+_12px)] z-20 mx-auto max-w-[430px] px-4">
      <AnimatePresence>
        {show && (
          <motion.button
            type="button"
            onClick={() => navigate('/cart')}
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            className="pointer-events-auto flex w-full items-center gap-3 rounded-lg px-4 py-3 text-on-primary shadow-float"
            style={{ background: 'var(--grad-primary)' }}
          >
          <span className="relative grid h-9 w-9 place-items-center rounded-md bg-white/20">
            <ShoppingCart size={20} />
            <span className="absolute -right-1 -top-1 min-w-[16px] rounded-full bg-accent px-1 text-center text-[9px] font-bold leading-4 text-on-accent mono-num">
              {count}
            </span>
          </span>
          <span className="flex flex-1 flex-col items-start leading-tight">
            <span className="text-[11px] font-semibold opacity-90">
              {groups.length} {groups.length === 1 ? 'shop' : 'shops'} · {count} item{count === 1 ? '' : 's'}
            </span>
            <span className="text-body font-bold mono-num">{money(total)}</span>
          </span>
          <span className="flex items-center gap-1 text-subhead font-bold">
            View cart <ChevronRight size={18} />
          </span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}
