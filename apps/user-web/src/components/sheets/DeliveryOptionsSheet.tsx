import * as Dialog from '@radix-ui/react-dialog'
import { AnimatePresence, motion } from 'framer-motion'
import { Truck } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/cn'
import { minutes, money, toNum } from '@/lib/format'
import type { CheckoutSellerSummary, DeliveryOption } from '@/api/types'

interface Props {
  open: boolean
  onClose: () => void
  seller: CheckoutSellerSummary | null
  selected: string | undefined
  onSelect: (quotationId: string) => void
}

function badgeFor(
  opt: DeliveryOption,
  rec: CheckoutSellerSummary['recommendations'],
): { tone: 'primary' | 'success' | 'warning'; label: string } | null {
  if (!rec) return null
  if (rec.recommended === opt.quotationId) return { tone: 'primary', label: 'Recommended' }
  if (rec.cheapest === opt.quotationId) return { tone: 'success', label: 'Cheapest' }
  if (rec.fastest === opt.quotationId) return { tone: 'warning', label: 'Fastest' }
  return null
}

export function DeliveryOptionsSheet({ open, onClose, seller, selected, onSelect }: Props) {
  const itemCount = seller?.items.reduce((n, it) => n + (it.quantity || 1), 0) ?? 0

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <AnimatePresence>
        {open && seller && (
          <Dialog.Portal forceMount>
            <Dialog.Title className="sr-only">Select delivery</Dialog.Title>
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

                {/* Seller info */}
                <div className="mb-4 border-b border-border-faint pb-3">
                  <p className="text-body font-bold text-text">{seller.seller.shopName}</p>
                  <p className="text-caption text-text-2">
                    {itemCount} item{itemCount === 1 ? '' : 's'} · {money(seller.bill.total)}
                  </p>
                </div>

                {/* Delivery label */}
                <p className="mb-3 flex items-center gap-1.5 text-subhead font-semibold text-text">
                  <Truck size={15} className="text-primary" /> Select delivery
                </p>

                {seller.deliveryOptions.length === 0 ? (
                  <p className="rounded-md bg-warning-soft px-3 py-2 text-caption text-warning">
                    No delivery partners available right now. Please try later.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {seller.deliveryOptions.map((opt) => {
                      const isSelected = selected === opt.quotationId
                      const badge = badgeFor(opt, seller.recommendations)
                      return (
                        <button
                          key={opt.quotationId}
                          type="button"
                          onClick={() => {
                            onSelect(opt.quotationId)
                            onClose()
                          }}
                          className={cn(
                            'flex w-full items-center gap-3 rounded-xl border-[1.5px] px-4 py-3 text-left transition-colors tap',
                            isSelected
                              ? 'border-primary bg-primary-soft'
                              : 'border-border bg-surface-2',
                          )}
                        >
                          <span
                            className={cn(
                              'grid h-5 w-5 shrink-0 place-items-center rounded-full border-2',
                              isSelected ? 'border-primary' : 'border-border-strong',
                            )}
                          >
                            {isSelected && (
                              <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                            )}
                          </span>
                          <span className="flex-1">
                            <span className="flex flex-wrap items-center gap-2">
                              <span className="text-subhead font-semibold text-text">
                                {opt.displayName || opt.providerName}
                              </span>
                              {badge && <Badge tone={badge.tone}>{badge.label}</Badge>}
                            </span>
                            <span className="text-caption text-text-2">
                              {minutes(opt.estimatedMinutes)} ETA
                            </span>
                          </span>
                          <span className="text-subhead font-bold text-text mono-num">
                            {money(toNum(opt.feeRupees))}
                          </span>
                        </button>
                      )
                    })}
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
