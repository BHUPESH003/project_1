import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, FileText, Store, Trash2, ShoppingBag } from 'lucide-react'
import { useCart, groupBySeller, useRemoveCartItem, useUpdateCartItem } from '@/api/hooks/useCart'
import { Button } from '@/components/ui/Button'
import { Stepper } from '@/components/ui/Stepper'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { assetUrl, money, toNum } from '@/lib/format'
import { cn } from '@/lib/cn'
import type { CartItem, CartItemFile } from '@/api/types'

function fileConfigSummary(f: CartItemFile): string {
  const p = f.payload as { color?: string; paperSize?: string; copies?: number }
  const parts: string[] = []
  if (p.color) parts.push(p.color === 'COLOR' ? 'Colour' : 'B&W')
  if (p.paperSize) parts.push(p.paperSize)
  if (p.copies) parts.push(`${p.copies} ${p.copies === 1 ? 'copy' : 'copies'}`)
  return parts.join(' · ')
}

function lineTotal(item: CartItem): number {
  if (item.lineTotal != null) return toNum(item.lineTotal)
  if (item.files?.length) {
    return item.files.reduce((s, f) => s + toNum((f.payload as { estimatedPrice?: number }).estimatedPrice ?? 0), 0)
  }
  return toNum(item.priceAtAdd) * item.quantity
}

export function CartPage() {
  const navigate = useNavigate()
  const { data: cart, isLoading, isError, refetch } = useCart()
  const remove = useRemoveCartItem()
  const update = useUpdateCartItem()

  const groups = groupBySeller(cart)
  const total = groups.reduce((s, g) => s + g.items.reduce((gs, it) => gs + lineTotal(it), 0), 0)
  const isEmpty = !isLoading && groups.length === 0

  return (
    <div className="flex min-h-dvh flex-col px-5 pb-40 pt-3">
      <div className="mb-3 flex items-center gap-2">
        <button onClick={() => navigate(-1)} aria-label="Back" className="tap -ml-2 grid h-10 w-10 place-items-center text-text-2">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-title-lg font-bold text-text">Your cart</h1>
      </div>

      {isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
        </div>
      )}

      {isError && <ErrorState onRetry={() => refetch()} message="Couldn't load your cart." />}

      {isEmpty && (
        <EmptyState
          icon={<ShoppingBag size={34} />}
          title="Your cart is empty"
          description="Browse nearby shops and add items to get started."
          action={<Button onClick={() => navigate('/')}>Explore shops</Button>}
        />
      )}

      <div className="space-y-4">
        <AnimatePresence initial={false}>
          {groups.map((g) => {
            const subtotal = g.items.reduce((s, it) => s + lineTotal(it), 0)
            return (
              <motion.section
                key={g.seller.id}
                layout
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden rounded-lg border border-border bg-surface"
              >
                <button
                  onClick={() => navigate(`/sellers/${g.seller.id}`)}
                  className="flex w-full items-center gap-2.5 border-b border-border-faint bg-surface-2 px-4 py-3 text-left"
                >
                  <span className="grid h-8 w-8 place-items-center overflow-hidden rounded-full bg-surface-3 text-text-3">
                    {assetUrl(g.seller.imagePath, g.seller.imageUrl) ? (
                      <img src={assetUrl(g.seller.imagePath, g.seller.imageUrl)} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Store size={16} />
                    )}
                  </span>
                  <span className="flex-1 truncate text-body font-semibold text-text">{g.seller.shopName}</span>
                </button>

                <div className="divide-y divide-border-faint px-4">
                  {g.items.map((item) => {
                    const isPrinting = !!item.files?.length
                    return (
                      <div key={item.id} className="flex gap-3 py-3">
                        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-surface-2 text-primary">
                          {isPrinting ? <FileText size={20} /> : <Store size={18} />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-body font-semibold text-text">
                            {(item.payload as { productName?: string }).productName ?? item.product?.name ?? 'Item'}
                          </p>
                          {isPrinting ? (
                            <div className="mt-0.5 space-y-0.5">
                              {item.files!.map((f) => (
                                <p key={f.id} className="truncate text-caption text-text-2">
                                  {(f.payload as { originalName?: string }).originalName ?? f.originalName ?? 'Document'}
                                  {f.pageCount ? ` · ${f.pageCount}p` : ''} — {fileConfigSummary(f)}
                                </p>
                              ))}
                            </div>
                          ) : (
                            item.product?.description && (
                              <p className="line-clamp-1 text-caption text-text-2">{item.product.description}</p>
                            )
                          )}
                          <div className="mt-1.5 flex items-center justify-between">
                            <span className="text-body font-bold text-text mono-num">{money(lineTotal(item))}</span>
                            {isPrinting ? (
                              <button
                                onClick={() => remove.mutate(item.id)}
                                className="inline-flex items-center gap-1 text-caption font-semibold text-danger"
                              >
                                <Trash2 size={14} /> Remove
                              </button>
                            ) : (
                              <Stepper
                                value={item.quantity}
                                onChange={(n) => (n <= 0 ? remove.mutate(item.id) : update.mutate({ id: item.id, quantity: n }))}
                                size="sm"
                                min={0}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="flex items-center justify-between border-t border-border-faint px-4 py-2.5">
                  <span className="text-subhead text-text-2">Subtotal</span>
                  <span className="text-subhead font-bold text-text mono-num">{money(subtotal)}</span>
                </div>
              </motion.section>
            )
          })}
        </AnimatePresence>

        {groups.length > 0 && (
          <div className="rounded-lg border border-border bg-surface p-4">
            {groups.map((g) => (
              <div key={g.seller.id} className="flex items-center justify-between py-1 text-subhead text-text-2">
                <span className="truncate">{g.seller.shopName}</span>
                <span className="mono-num">{money(g.items.reduce((s, it) => s + lineTotal(it), 0))}</span>
              </div>
            ))}
            <div className="my-2 border-t border-border" />
            <div className="flex items-center justify-between">
              <span className="text-body font-semibold text-text">Total</span>
              <span className="text-title-lg font-bold text-primary mono-num">{money(total)}</span>
            </div>
            <p className="mt-1 text-caption text-text-3">Delivery charges calculated at checkout.</p>
          </div>
        )}
      </div>

      {groups.length > 0 && (
        <div
          className={cn(
            'fixed inset-x-0 bottom-[var(--bottom-nav-h)] z-30 mx-auto max-w-[430px] glass px-5 py-3',
          )}
        >
          <Button full size="lg" onClick={() => navigate('/checkout')}>
            Proceed to checkout — {money(total)}
          </Button>
        </div>
      )}
    </div>
  )
}
