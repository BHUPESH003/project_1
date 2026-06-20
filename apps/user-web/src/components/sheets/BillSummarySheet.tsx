import * as Dialog from '@radix-ui/react-dialog'
import { AnimatePresence, motion } from 'framer-motion'
import { money, toNum } from '@/lib/format'
import type { CheckoutSellerSummary } from '@/api/types'

interface Props {
  open: boolean
  onClose: () => void
  sellers: CheckoutSellerSummary[]
  selections: Record<string, string>
}

export function BillSummarySheet({ open, onClose, sellers, selections }: Props) {
  const itemsTotal = sellers.reduce((s, sel) => s + toNum(sel.bill.total), 0)
  const deliveryTotal = sellers.reduce((s, sel) => {
    const opt = sel.deliveryOptions.find((o) => o.quotationId === selections[sel.seller.id])
    return s + (opt ? toNum(opt.feeRupees) : 0)
  }, 0)
  const discountTotal = sellers.reduce((s, sel) => s + toNum(sel.bill.discountAmount), 0)
  const grandTotal = itemsTotal + deliveryTotal

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Title className="sr-only">Bill Summary</Dialog.Title>
            {/* Backdrop */}
            <Dialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 bg-black/40"
                onClick={onClose}
              />
            </Dialog.Overlay>

            {/* Sheet */}
            <Dialog.Content asChild onEscapeKeyDown={onClose} onInteractOutside={(e) => e.preventDefault()}>
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 350 }}
                className="fixed bottom-0 left-1/2 z-50 w-full max-w-[430px] -translate-x-1/2 rounded-t-2xl bg-surface px-5 pt-2 pb-[max(28px,env(safe-area-inset-bottom))]"
              >
                {/* Handle */}
                <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />

                <h2 className="mb-5 text-title font-bold text-text">Bill Summary</h2>

                <div className="space-y-3">
                  {/* Per-seller item subtotals */}
                  {sellers.map((sel) => (
                    <div
                      key={sel.seller.id}
                      className="flex items-center justify-between text-subhead text-text-2"
                    >
                      <span className="truncate pr-4">Item total for {sel.seller.shopName}</span>
                      <span className="shrink-0 mono-num">{money(sel.bill.total)}</span>
                    </div>
                  ))}

                  {/* Delivery */}
                  <div className="flex items-center justify-between text-subhead text-text-2">
                    <span>Delivery partners' fee</span>
                    <span className="mono-num">
                      {deliveryTotal > 0 ? money(deliveryTotal) : '—'}
                    </span>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-border" />

                  {/* Grand total */}
                  <div className="flex items-center justify-between">
                    <span className="text-body font-bold text-text">To pay</span>
                    <span className="text-body font-bold text-primary mono-num">
                      {money(grandTotal)}
                    </span>
                  </div>
                </div>

                {/* Savings banner */}
                {discountTotal > 0 && (
                  <div className="mt-4 rounded-lg bg-success-soft px-4 py-2.5">
                    <p className="text-subhead font-semibold text-success">
                      You saved {money(discountTotal)} on this order
                    </p>
                  </div>
                )}
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  )
}
