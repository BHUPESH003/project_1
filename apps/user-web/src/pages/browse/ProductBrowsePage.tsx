import { useSearchParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Store } from 'lucide-react'
import { Icon } from '@repo/icons'
import { useProductBrowse } from '@/api/hooks/useProducts'
import { Price } from '@/components/ui/Price'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { assetUrl } from '@/lib/format'

export function ProductBrowsePage() {
  const navigate = useNavigate()
  const [sp] = useSearchParams()
  const categoryId = sp.get('categoryId') ?? undefined
  const subCategory = sp.get('sub') ?? undefined

  const { data, isLoading, isError, refetch } = useProductBrowse({ categoryId, subCategory })

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="px-5 pb-28 pt-4"
    >
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-16 w-16 shrink-0 rounded-xl" />
              <div className="flex-1 space-y-2 py-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-3 w-1/4" />
              </div>
            </div>
          ))}
        </div>
      ) : isError ? (
        <ErrorState message="Failed to load products." onRetry={() => refetch()} />
      ) : !data?.length ? (
        <EmptyState
          icon={<Store size={34} />}
          title="No products yet"
          description="No sellers have listed products in this sub-category yet."
        />
      ) : (
        <>
          <p className="mb-3 text-caption text-text-3">
            {data.length} product{data.length !== 1 ? 's' : ''} · sorted by newest
          </p>
          <div className="divide-y divide-border-faint">
            {data.map((p) => {
              const img = assetUrl(p.image, undefined)
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => navigate(`/sellers/${p.seller.id}`)}
                  className="tap flex w-full items-center gap-3 py-3 text-left"
                >
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-surface-2">
                    {img ? (
                      <img src={img} alt={p.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-text-3">
                        <Store size={22} />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate text-body font-semibold text-text">{p.name}</p>
                      {p.isBestSeller && (
                        <span className="shrink-0 rounded-full bg-amber-100 px-2 py-px text-[9px] font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                          BEST
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-caption text-text-2">
                      <Icon name="storefront" size={11} />
                      <span className="truncate">{p.seller.shopName}</span>
                      {!p.seller.isOnline && (
                        <span className="shrink-0 rounded-full bg-surface-2 px-1.5 py-px text-[9px] font-semibold text-text-3">
                          OFFLINE
                        </span>
                      )}
                    </div>
                    <Price amount={p.price} mrp={p.mrp} size="sm" className="mt-1" />
                  </div>
                </button>
              )
            })}
          </div>
        </>
      )}
    </motion.div>
  )
}
