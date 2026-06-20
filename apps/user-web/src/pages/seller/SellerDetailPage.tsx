import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Heart, Store, Clock, MapPin, ChevronRight } from 'lucide-react'
import { useSeller, useSellerProducts } from '@/api/hooks/useSellers'
import { useToggleFavorite } from '@/api/hooks/useFavorites'
import { useCart, groupBySeller } from '@/api/hooks/useCart'
import { ProductRow } from '@/components/cards/ProductRow'
import { Rating } from '@/components/ui/Rating'
import { Skeleton } from '@/components/ui/Skeleton'
import { ErrorState, EmptyState } from '@/components/ui/States'
import { PrintConfigSheet } from '@/components/sheets/PrintConfigSheet'
import { useAddressStore } from '@/stores/addressStore'
import { assetUrl, distance, minutes, money, toNum } from '@/lib/format'
import { cn } from '@/lib/cn'
import type { Product } from '@/api/types'

export function SellerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const address = useAddressStore((s) => s.selectedAddress)
  const seller = useSeller(id, address?.latitude, address?.longitude)
  const products = useSellerProducts(id)
  const toggleFav = useToggleFavorite()
  const { data: cart } = useCart()

  const [configProduct, setConfigProduct] = useState<Product | null>(null)

  const offline = seller.data?.status === 'OFFLINE'
  const cover = assetUrl(seller.data?.imagePath, seller.data?.imageUrl)
  const isFav = !!seller.data?.isFavorite

  const grouped = useMemo(() => {
    const map = new Map<string, Product[]>()
    for (const p of products.data ?? []) {
      // Use subCategory from metadata as a finer grouping if available
      const key = (p.metadata?.subCategory as string | undefined) || p.category || 'Products'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(p)
    }
    return [...map.entries()]
  }, [products.data])

  // Cart summary for THIS seller.
  const thisGroup = groupBySeller(cart).find((g) => g.seller.id === id)
  const thisCount = thisGroup?.items.reduce((s, it) => s + (it.quantity || 1), 0) ?? 0
  const thisTotal = thisGroup ? toNum(thisGroup.subtotal) : 0

  if (seller.isError) {
    return (
      <div className="pt-10">
        <ErrorState message="Couldn't load this shop." onRetry={() => seller.refetch()} />
      </div>
    )
  }

  return (
    <div className="pb-40">
      {/* Hero */}
      <div className="relative h-52 w-full bg-surface-3">
        {seller.isLoading ? (
          <Skeleton className="h-full w-full rounded-none" />
        ) : cover ? (
          <img src={cover} alt={seller.data?.shopName} className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center text-text-3" style={{ background: 'var(--grad-primary)' }}>
            <Store size={48} className="text-white/70" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4 pt-[max(16px,env(safe-area-inset-top))]">
          <button onClick={() => navigate(-1)} aria-label="Back" className="glass grid h-10 w-10 place-items-center rounded-full text-text">
            <ArrowLeft size={20} />
          </button>
          <button
            onClick={() => seller.data && toggleFav.mutate({ sellerId: seller.data.id, isFavorite: isFav })}
            aria-label="Favourite"
            className="glass grid h-10 w-10 place-items-center rounded-full"
          >
            <Heart size={20} className={cn(isFav ? 'fill-danger text-danger' : 'text-text')} />
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="px-5 pt-4">
        {seller.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        ) : (
          seller.data && (
            <>
              <div className="flex items-start justify-between gap-2">
                <h1 className="text-title-lg font-bold text-text">{seller.data.shopName}</h1>
                <span
                  className={cn(
                    'shrink-0 rounded-full px-2.5 py-1 text-caption font-semibold',
                    offline ? 'bg-surface-2 text-text-3' : 'bg-success-soft text-success',
                  )}
                >
                  {offline ? 'Closed' : 'Open'}
                </span>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-subhead text-text-2">
                <Rating value={seller.data.rating} size="sm" />
                {seller.data.prepTimeMinutes != null && (
                  <>
                    <span className="text-text-3">·</span>
                    <span className="inline-flex items-center gap-1">
                      <Clock size={13} /> {minutes(seller.data.prepTimeMinutes)}
                    </span>
                  </>
                )}
                {seller.data.distanceKm != null && (
                  <>
                    <span className="text-text-3">·</span>
                    <span className="mono-num">{distance(seller.data.distanceKm)}</span>
                  </>
                )}
              </div>
              {seller.data.description && (
                <p className="mt-2 text-subhead text-text-2">{seller.data.description}</p>
              )}
              <p className="mt-2 flex items-start gap-1.5 text-caption text-text-3">
                <MapPin size={14} className="mt-0.5 shrink-0" /> {seller.data.address}
              </p>
              {seller.data.pricePerPage != null && (
                <span className="mt-2 inline-block rounded-full bg-primary-soft px-3 py-1 text-caption font-semibold text-on-primary-soft">
                  B&amp;W from {money(seller.data.pricePerPage)}/page
                </span>
              )}
            </>
          )
        )}
      </div>

      {offline && (
        <div className="mx-5 mt-4 rounded-md bg-warning-soft px-4 py-3 text-subhead font-medium text-warning">
          This shop is currently closed. Browse products for later.
        </div>
      )}

      {/* Products */}
      <div className="mt-4 px-5">
        {products.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-md" />
            ))}
          </div>
        ) : products.isError ? (
          <ErrorState message="Couldn't load products." onRetry={() => products.refetch()} />
        ) : grouped.length === 0 ? (
          <EmptyState icon={<Store size={32} />} title="No products yet" description="This shop hasn't listed any products." />
        ) : (
          grouped.map(([category, items]) => (
            <section key={category} className="mb-5">
              <div className="mb-2 flex items-center gap-2">
                <h2 className="text-subhead font-bold uppercase tracking-wide text-text-3">
                  {category}
                </h2>
                <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-semibold text-text-3">
                  {items.length > 99 ? '99+' : items.length}
                </span>
              </div>
              <div className="divide-y divide-border-faint">
                {items.map((p) => (
                  <ProductRow
                    key={p.id}
                    product={p}
                    sellerId={id!}
                    disabled={offline}
                    onConfigurePrinting={setConfigProduct}
                  />
                ))}
              </div>
            </section>
          ))
        )}
      </div>

      {/* Sticky cart bar (this seller) */}
      <AnimatePresence>
        {thisCount > 0 && (
          <motion.button
            type="button"
            onClick={() => navigate('/cart')}
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            className="fixed inset-x-0 bottom-[var(--bottom-nav-h)] z-30 mx-auto flex max-w-[430px] items-center gap-3 px-5 py-3"
          >
            <span className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-on-primary shadow-float" style={{ background: 'var(--grad-primary)' }}>
              <span className="flex flex-1 flex-col items-start leading-tight">
                <span className="text-[11px] font-semibold opacity-90">{thisCount} item{thisCount === 1 ? '' : 's'} from this shop</span>
                <span className="text-body font-bold mono-num">{money(thisTotal)}</span>
              </span>
              <span className="flex items-center gap-1 text-subhead font-bold">
                View cart <ChevronRight size={18} />
              </span>
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {seller.data && (
        <PrintConfigSheet
          open={!!configProduct}
          onOpenChange={(o) => !o && setConfigProduct(null)}
          seller={seller.data}
          product={configProduct}
        />
      )}
    </div>
  )
}
