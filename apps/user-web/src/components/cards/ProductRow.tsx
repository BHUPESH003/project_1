import { Printer, Star } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Stepper } from '@/components/ui/Stepper'
import { Price } from '@/components/ui/Price'
import { Badge } from '@/components/ui/Badge'
import { useAddToCart, useCart, useRemoveCartItem, useUpdateCartItem } from '@/api/hooks/useCart'
import { assetUrl } from '@/lib/format'
import { cn } from '@/lib/cn'
import type { Product } from '@/api/types'

export function isPrintingProduct(p: Product): boolean {
  return /print/i.test(p.category)
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
  const { data: cart } = useCart()
  const add = useAddToCart()
  const update = useUpdateCartItem()
  const remove = useRemoveCartItem()

  const printing = isPrintingProduct(product)
  // Match simple (non-file) cart line for this product.
  const line = cart?.items.find((it) => it.productId === product.id && !(it.files?.length))
  const qty = line?.quantity ?? 0
  const img = assetUrl(product.image, product.imageUrl)
  const unavailable = disabled || !product.inStock

  function setQty(n: number) {
    if (!line) {
      if (n > 0) add.mutate({ sellerId, productId: product.id, quantity: n })
      return
    }
    if (n <= 0) remove.mutate(line.id)
    else update.mutate({ id: line.id, quantity: n })
  }

  return (
    <div className="flex gap-3 py-3">
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md bg-surface-2">
        {img ? (
          <img src={img} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center text-text-3">
            <Printer size={22} />
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-1.5">
          <h4 className="truncate text-body font-semibold text-text">{product.name}</h4>
          {product.isBestSeller && (
            <Badge tone="warning" className="shrink-0">
              <Star size={10} className="fill-current" /> Best
            </Badge>
          )}
        </div>
        {product.description && (
          <p className="line-clamp-1 text-caption text-text-2">{product.description}</p>
        )}
        <div className="mt-1 flex items-center justify-between gap-2">
          <Price amount={product.price} mrp={product.mrp} size="sm" />

          {unavailable ? (
            <span className="text-caption font-semibold text-text-3">Unavailable</span>
          ) : printing ? (
            <Button size="sm" variant="secondary" icon={<Printer size={15} />} onClick={() => onConfigurePrinting?.(product)}>
              Configure
            </Button>
          ) : qty > 0 ? (
            <Stepper value={qty} onChange={setQty} size="sm" min={0} />
          ) : (
            <Button size="sm" variant="secondary" onClick={() => setQty(1)} className={cn(add.isPending && 'opacity-70')}>
              ADD
            </Button>
          )}
        </div>
        {product.unit && <span className="mt-0.5 text-[10px] uppercase tracking-wide text-text-3">{product.unit}</span>}
      </div>
    </div>
  )
}
