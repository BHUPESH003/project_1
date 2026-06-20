/* eslint-disable react-refresh/only-export-components */
import { Bookmark, Plus, Printer, Share2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { useAddToCart, useCart, useRemoveCartItem, useUpdateCartItem } from '@/api/hooks/useCart'
import { assetUrl, money, toNum } from '@/lib/format'
import { cn } from '@/lib/cn'
import type { Product } from '@/api/types'

export function isPrintingProduct(p: Product): boolean {
  return /print/i.test(p.category)
}

function VegBadge({ veg }: { veg: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-sm border-2',
        veg ? 'border-green-600' : 'border-red-600',
      )}
    >
      <span className={cn('h-2 w-2 rounded-full', veg ? 'bg-green-600' : 'bg-red-600')} />
    </span>
  )
}

export function ProductRow({
  product,
  sellerId,
  disabled,
  onConfigurePrinting,
}: {
  product: Product
  sellerId: string
  disabled?: boolean
  onConfigurePrinting?: (product: Product) => void
}) {
  const navigate = useNavigate()
  const { data: cart } = useCart()
  const add = useAddToCart()
  const update = useUpdateCartItem()
  const remove = useRemoveCartItem()

  const printing = isPrintingProduct(product)
  const line = cart?.items.find((it) => it.productId === product.id && !(it.files?.length))
  const qty = line?.quantity ?? 0
  const img = assetUrl(product.image, product.imageUrl)
  const unavailable = disabled || !product.inStock
  const veg = product.metadata?.veg
  const price = toNum(product.price)
  const mrp = toNum(product.mrp)
  const hasDiscount = mrp > 0 && mrp > price

  function setQty(n: number) {
    if (!line) {
      if (n > 0) add.mutate({ sellerId, productId: product.id, quantity: n })
      return
    }
    if (n <= 0) remove.mutate(line.id)
    else update.mutate({ id: line.id, quantity: n })
  }

  function goToDetail() {
    navigate(`/sellers/${sellerId}/products/${product.id}`)
  }

  function shareProduct(e: React.MouseEvent) {
    e.stopPropagation()
    navigator.share?.({
      title: product.name,
      text: product.description ?? undefined,
      url: window.location.origin + `/sellers/${sellerId}/products/${product.id}`,
    })
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={goToDetail}
      onKeyDown={(e) => e.key === 'Enter' && goToDetail()}
      className="flex cursor-pointer gap-3 py-4 focus:outline-none"
    >
      {/* ── Left: text content ────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Veg / non-veg indicator */}
        {veg !== undefined && (
          <div className="mb-1.5">
            <VegBadge veg={!!veg} />
          </div>
        )}

        {/* Product name */}
        <h4 className="text-title font-bold leading-snug text-text line-clamp-2">
          {product.name}
        </h4>

        {/* Price row */}
        <div className="mt-1 flex items-baseline gap-1.5">
          <span className="text-body font-semibold text-text">{money(price)}</span>
          {hasDiscount && (
            <span className="text-caption text-text-3 line-through">{money(mrp)}</span>
          )}
        </div>

        {/* Description + "more" */}
        {product.description && (
          <p className="mt-1 text-caption text-text-2 line-clamp-2">
            {product.description}
            {product.description.length > 60 && (
              <span className="font-bold text-text"> more</span>
            )}
          </p>
        )}

        {/* Action icons: bookmark + share */}
        <div
          className="mt-2.5 flex items-center gap-2"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            aria-label="Save"
            onClick={(e) => { e.stopPropagation(); goToDetail() }}
            className={cn(
              'grid h-8 w-8 place-items-center rounded-full bg-surface-2 text-text-3 tap',
              product.isWishlisted && 'text-primary',
            )}
          >
            <Bookmark size={15} className={product.isWishlisted ? 'fill-current' : ''} />
          </button>
          <button
            type="button"
            aria-label="Share"
            onClick={shareProduct}
            className="grid h-8 w-8 place-items-center rounded-full bg-surface-2 text-text-3 tap"
          >
            <Share2 size={15} />
          </button>
        </div>
      </div>

      {/* ── Right: image + ADD overlay ─────────────────────────────── */}
      <div className="relative h-32.5 w-32.5 shrink-0">
        {/* Image container */}
        <div className="h-full w-full overflow-hidden rounded-xl bg-surface-2">
          {img ? (
            <img src={img} alt={product.name} className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full w-full place-items-center text-text-3">
              <Printer size={28} />
            </div>
          )}
        </div>

        {/* ADD / Stepper / Configure button — overlaid at image bottom */}
        <div
          className="absolute bottom-2 left-2 right-2"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          {unavailable ? (
            <div className="w-full rounded-lg bg-surface/90 py-1.5 text-center text-micro font-semibold text-text-3 shadow-sm backdrop-blur-sm">
              Unavailable
            </div>
          ) : printing ? (
            <Button
              size="sm"
              variant="secondary"
              icon={<Printer size={13} />}
              onClick={() => onConfigurePrinting?.(product)}
              className="w-full justify-center text-xs"
            >
              Configure
            </Button>
          ) : qty > 0 ? (
            <div className="flex w-full items-center justify-between rounded-lg border border-green-300 bg-white/95 px-3 py-1.5 shadow-sm backdrop-blur-sm">
              <button
                type="button"
                onClick={() => setQty(qty - 1)}
                className="text-lg font-extrabold leading-none text-green-600"
              >
                −
              </button>
              <span className="text-sm font-bold text-green-700">{qty}</span>
              <button
                type="button"
                onClick={() => setQty(qty + 1)}
                className="text-lg font-extrabold leading-none text-green-600"
              >
                +
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setQty(1)}
              className={cn(
                'flex w-full items-center justify-center gap-1 rounded-lg border border-green-300 bg-white/95 py-1.5 text-sm font-extrabold text-green-600 shadow-sm backdrop-blur-sm tap',
                add.isPending && 'opacity-60',
              )}
            >
              ADD
              <Plus size={13} strokeWidth={3} className="text-green-500" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
