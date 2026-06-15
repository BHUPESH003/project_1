import { useNavigate } from 'react-router-dom'
import { ImageOff } from 'lucide-react'
import { Switch } from '@/components/ui/Switch'
import { money, assetUrl } from '@/lib/format'
import { cn } from '@/lib/cn'
import type { Product } from '@/types/api'

export function ProductCard({
  product,
  onToggleStock,
  toggling,
}: {
  product: Product
  onToggleStock: (inStock: boolean) => void
  toggling?: boolean
}) {
  const navigate = useNavigate()
  const img = product.image ? assetUrl(product.image) : undefined

  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border border-border bg-surface',
        !product.inStock && 'opacity-70',
      )}
    >
      <button onClick={() => navigate(`/products/${product.id}`)} className="block w-full text-left">
        <div className="relative aspect-[4/3] w-full bg-surface-2">
          {img ? (
            <img src={img} alt={product.name} className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full w-full place-items-center text-text-3">
              <ImageOff size={26} />
            </div>
          )}
          {product.isBestSeller && (
            <span className="absolute left-2 top-2 rounded-full bg-accent px-2 py-0.5 text-micro font-bold text-on-accent">
              Best seller
            </span>
          )}
        </div>
        <div className="p-3">
          <p className="line-clamp-1 text-subhead font-semibold text-text">{product.name}</p>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-body font-extrabold text-text tnum">{money(product.price)}</span>
            {product.mrp != null && product.mrp > product.price && (
              <span className="text-caption text-text-3 line-through tnum">{money(product.mrp)}</span>
            )}
            {product.unit && <span className="text-micro text-text-3">/ {product.unit}</span>}
          </div>
        </div>
      </button>
      <div className="flex items-center justify-between border-t border-border-faint px-3 py-2">
        <span className={cn('text-caption font-medium', product.inStock ? 'text-success' : 'text-text-3')}>
          {product.inStock ? 'In stock' : 'Out of stock'}
        </span>
        <Switch
          checked={product.inStock}
          onCheckedChange={onToggleStock}
          disabled={toggling}
          tone="success"
          aria-label="Toggle stock"
        />
      </div>
    </div>
  )
}
