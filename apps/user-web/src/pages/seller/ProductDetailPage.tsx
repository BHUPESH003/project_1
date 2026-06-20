import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  Share2,
  ChevronDown,
  ChevronUp,
  ShoppingCart,
} from 'lucide-react'
import { useSeller } from '@/api/hooks/useSellers'
import { useProduct } from '@/api/hooks/useSellers'
import { useAddToCart, useCart, useRemoveCartItem, useUpdateCartItem } from '@/api/hooks/useCart'
import { Skeleton } from '@/components/ui/Skeleton'
import { ErrorState } from '@/components/ui/States'
import { Stepper } from '@/components/ui/Stepper'
import { Badge } from '@/components/ui/Badge'
import { assetUrl, money } from '@/lib/format'
import { cn } from '@/lib/cn'
import type { ProductMetadata } from '@/api/types'

// ─── Veg/Non-veg indicator ────────────────────────────────────────────────────
function VegDot({ veg }: { veg: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex h-4 w-4 items-center justify-center rounded-sm border-2',
        veg ? 'border-green-600' : 'border-red-600',
      )}
    >
      <span
        className={cn(
          'h-2 w-2 rounded-full',
          veg ? 'bg-green-600' : 'bg-red-600',
        )}
      />
    </span>
  )
}

// ─── Image gallery ────────────────────────────────────────────────────────────
function ImageGallery({ primary, extras }: { primary: string | null; extras?: string[] }) {
  const all = [primary, ...(extras ?? [])].filter(Boolean) as string[]
  const [active, setActive] = useState(0)
  if (all.length === 0) {
    return (
      <div className="flex h-64 w-full items-center justify-center bg-surface-2 text-text-3">
        <ShoppingCart size={48} className="opacity-30" />
      </div>
    )
  }
  return (
    <div>
      <div className="relative h-64 w-full overflow-hidden bg-surface-2">
        <img src={all[active]} alt="" className="h-full w-full object-cover" />
      </div>
      {all.length > 1 && (
        <div className="flex justify-center gap-1.5 py-2">
          {all.map((_, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={cn(
                'h-1.5 rounded-full transition-all',
                i === active ? 'w-4 bg-primary' : 'w-1.5 bg-border',
              )}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Collapsible description ──────────────────────────────────────────────────
function ExpandableText({ text, maxLines = 3 }: { text: string; maxLines?: number }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div>
      <p
        className={cn('text-body text-text-2 transition-all', !expanded && 'line-clamp-3')}
        style={!expanded ? { WebkitLineClamp: maxLines } : undefined}
      >
        {text}
      </p>
      <button
        onClick={() => setExpanded((v) => !v)}
        className="mt-1 flex items-center gap-1 text-caption font-semibold text-primary"
      >
        {expanded ? (
          <>less <ChevronUp size={13} /></>
        ) : (
          <>more <ChevronDown size={13} /></>
        )}
      </button>
    </div>
  )
}

// ─── Tab system ───────────────────────────────────────────────────────────────
type Tab = { key: string; label: string; content: React.ReactNode }

function Tabs({ tabs }: { tabs: Tab[] }) {
  const [active, setActive] = useState(tabs[0]?.key ?? '')
  if (tabs.length === 0) return null
  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-0 overflow-x-auto border-b border-border-faint">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className={cn(
              'shrink-0 px-4 py-2.5 text-subhead font-semibold transition-colors',
              t.key === active
                ? 'border-b-2 border-primary text-primary'
                : 'text-text-3',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      {/* Active panel */}
      <AnimatePresence mode="wait">
        <motion.div
          key={active}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="py-3"
        >
          {tabs.find((t) => t.key === active)?.content}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// ─── Key-value table (for specs / nutrition / catch-all) ──────────────────────
function KVTable({ data }: { data: Record<string, string | number> }) {
  const entries = Object.entries(data).filter(([k]) => !k.startsWith('_'))
  if (entries.length === 0) return null
  return (
    <table className="w-full text-body">
      <tbody>
        {entries.map(([k, v], i) => (
          <tr key={k} className={cn('align-top', i % 2 === 0 ? 'bg-surface-2' : '')}>
            <td className="py-2 pl-3 pr-4 font-semibold text-text-2 w-2/5">{k}</td>
            <td className="py-2 pr-3 text-text">{String(v)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ─── Build dynamic tabs from metadata ────────────────────────────────────────
const KNOWN_KEYS = new Set([
  'veg', 'highlights', 'badge', 'specs', 'longDescription',
  'images', 'subCategory', 'variants', 'nutrition',
])

function buildTabs(description: string | null, meta: ProductMetadata | null | undefined): Tab[] {
  const tabs: Tab[] = []

  const longDesc = meta?.longDescription ?? description
  if (longDesc) {
    tabs.push({
      key: 'description',
      label: 'Description',
      content: <p className="px-3 text-body text-text-2 leading-relaxed">{longDesc}</p>,
    })
  }

  if (meta?.specs && Object.keys(meta.specs).length > 0) {
    tabs.push({
      key: 'specs',
      label: 'Specifications',
      content: <KVTable data={meta.specs} />,
    })
  }

  if (meta?.nutrition && Object.keys(meta.nutrition).length > 0) {
    tabs.push({
      key: 'nutrition',
      label: 'Nutrition',
      content: <KVTable data={meta.nutrition} />,
    })
  }

  // Catch-all: any unknown top-level key with a string/number value
  if (meta) {
    const extra: Record<string, string | number> = {}
    for (const [k, v] of Object.entries(meta)) {
      if (!KNOWN_KEYS.has(k) && (typeof v === 'string' || typeof v === 'number')) {
        extra[k] = v
      }
    }
    if (Object.keys(extra).length > 0) {
      tabs.push({
        key: 'more',
        label: 'More Details',
        content: <KVTable data={extra} />,
      })
    }
  }

  return tabs
}

// ─── Variant selector ────────────────────────────────────────────────────────
function VariantSelector({
  variants,
  selected,
  onSelect,
}: {
  variants: NonNullable<ProductMetadata['variants']>
  selected: string
  onSelect: (id: string) => void
}) {
  return (
    <div>
      <p className="mb-2 text-subhead font-semibold text-text-2">Options</p>
      <div className="flex flex-wrap gap-2">
        {variants.map((v) => {
          const unavail = v.inStock === false
          return (
            <button
              key={v.id}
              disabled={unavail}
              onClick={() => onSelect(v.id)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-caption font-semibold transition-colors',
                v.id === selected
                  ? 'border-primary bg-primary-soft text-primary'
                  : 'border-border text-text-2',
                unavail && 'opacity-40',
              )}
            >
              {v.name}
              {v.priceDelta != null && v.priceDelta !== 0 && (
                <span className="ml-1 opacity-70">
                  {v.priceDelta > 0 ? '+' : ''}
                  {money(v.priceDelta)}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export function ProductDetailPage() {
  const { id: sellerId, productId } = useParams<{ id: string; productId: string }>()
  const navigate = useNavigate()

  const seller = useSeller(sellerId)
  const { data: product, isLoading, isError, refetch } = useProduct(sellerId, productId)

  const { data: cart } = useCart()
  const add = useAddToCart()
  const update = useUpdateCartItem()
  const remove = useRemoveCartItem()

  const [selectedVariant, setSelectedVariant] = useState<string>('')

  const offline = seller.data?.status === 'OFFLINE'
  const meta = product?.metadata ?? null
  const img = product ? assetUrl(product.image, product.imageUrl) : null
  const extraImages = (meta?.images ?? []).filter(Boolean) as string[]

  // Cart line for this product (non-file line)
  const line = cart?.items.find((it) => it.productId === product?.id && !(it.files?.length))
  const qty = line?.quantity ?? 0

  function setQty(n: number) {
    if (!product || !sellerId) return
    if (!line) {
      if (n > 0) add.mutate({ sellerId, productId: product.id, quantity: n })
      return
    }
    if (n <= 0) remove.mutate(line.id)
    else update.mutate({ id: line.id, quantity: n })
  }

  const unavailable = offline || !product?.inStock

  // Share
  function handleShare() {
    if (navigator.share && product) {
      navigator.share({ title: product.name, text: product.description ?? '', url: window.location.href })
    }
  }

  if (isLoading) {
    return (
      <div className="pb-32">
        <Skeleton className="h-64 w-full rounded-none" />
        <div className="space-y-3 p-5">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      </div>
    )
  }

  if (isError || !product) {
    return (
      <div className="pt-10">
        <ErrorState message="Couldn't load this product." onRetry={refetch} />
      </div>
    )
  }

  const tabs = buildTabs(product.description, meta)
  const basePrice = Number(product.price)
  const variants = meta?.variants ?? []
  const activeVariant = variants.find((v) => v.id === selectedVariant)
  const displayPrice = basePrice + (activeVariant?.priceDelta ?? 0)

  const discountPct =
    product.mrp && Number(product.mrp) > displayPrice
      ? Math.round(((Number(product.mrp) - displayPrice) / Number(product.mrp)) * 100)
      : null

  return (
    <div className="pb-32">
      {/* Floating back/share header */}
      <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between p-4 pt-[max(16px,env(safe-area-inset-top))]">
        <button
          onClick={() => navigate(-1)}
          className="glass grid h-10 w-10 place-items-center rounded-full text-text shadow-md"
          aria-label="Back"
        >
          <ArrowLeft size={20} />
        </button>
        {typeof navigator.share === 'function' && (
          <button
            onClick={handleShare}
            className="glass grid h-10 w-10 place-items-center rounded-full text-text shadow-md"
            aria-label="Share"
          >
            <Share2 size={18} />
          </button>
        )}
      </div>

      {/* Hero image / gallery */}
      <ImageGallery primary={img ?? null} extras={extraImages} />

      {/* Product info */}
      <div className="px-5 pt-4 space-y-4">

        {/* Veg/Non-veg + Badges row */}
        <div className="flex flex-wrap items-center gap-2">
          {meta?.veg !== undefined && <VegDot veg={!!meta.veg} />}
          {product.isBestSeller && <Badge tone="warning">Best Seller</Badge>}
          {meta?.badge && <Badge tone="primary">{meta.badge}</Badge>}
          {!product.inStock && (
            <Badge tone="danger">Out of Stock</Badge>
          )}
        </div>

        {/* Name */}
        <h1 className="text-title-lg font-bold text-text leading-snug">{product.name}</h1>

        {/* Price */}
        <div className="flex items-baseline gap-3">
          <span className="text-title-lg font-bold text-text mono-num">
            {money(displayPrice)}
          </span>
          {product.mrp && Number(product.mrp) > displayPrice && (
            <span className="text-body text-text-3 line-through mono-num">
              {money(Number(product.mrp))}
            </span>
          )}
          {discountPct != null && discountPct > 0 && (
            <span className="rounded-sm bg-success-soft px-2 py-0.5 text-caption font-bold text-success">
              {discountPct}% off
            </span>
          )}
        </div>

        {/* Unit */}
        {product.unit && (
          <p className="text-caption uppercase tracking-wide text-text-3">{product.unit}</p>
        )}

        {/* Short description (collapsible if long) */}
        {product.description && product.description.length > 80 ? (
          <ExpandableText text={product.description} />
        ) : product.description ? (
          <p className="text-body text-text-2">{product.description}</p>
        ) : null}

        {/* Variant selector */}
        {variants.length > 0 && (
          <VariantSelector
            variants={variants}
            selected={selectedVariant || variants[0]?.id}
            onSelect={setSelectedVariant}
          />
        )}

        {/* Highlights */}
        {meta?.highlights && meta.highlights.length > 0 && (
          <div>
            <h2 className="mb-2 text-subhead font-bold text-text">Product Highlights</h2>
            <ul className="space-y-1.5">
              {meta.highlights.map((h, i) => (
                <li key={i} className="flex items-start gap-2 text-body text-text-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  {h}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Dynamic tabs */}
        {tabs.length > 0 && (
          <div className="rounded-xl bg-surface-2 overflow-hidden">
            <Tabs tabs={tabs} />
          </div>
        )}
      </div>

      {/* Sticky bottom bar */}
      <div className="fixed inset-x-0 bottom-(--bottom-nav-h) z-30 mx-auto max-w-107.5 px-5 py-3 bg-bg/90 backdrop-blur-sm border-t border-border-faint">
        {unavailable ? (
          <div className="flex h-12 items-center justify-center rounded-xl bg-surface-2 text-subhead font-semibold text-text-3">
            {offline ? 'Shop is closed' : 'Out of stock'}
          </div>
        ) : qty > 0 ? (
          <div className="flex items-center justify-between gap-4">
            <Stepper value={qty} onChange={setQty} min={0} />
            <button
              onClick={() => navigate('/cart')}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-body font-bold text-on-primary shadow-float"
              style={{ background: 'var(--grad-primary)' }}
            >
              <ShoppingCart size={18} /> View Cart
            </button>
          </div>
        ) : (
          <button
            onClick={() => setQty(1)}
            disabled={add.isPending}
            className="w-full rounded-xl py-3.5 text-body font-bold text-on-primary shadow-float disabled:opacity-70"
            style={{ background: 'var(--grad-primary)' }}
          >
            Add to Cart
          </button>
        )}
      </div>
    </div>
  )
}
