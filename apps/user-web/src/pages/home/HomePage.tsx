import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Search, Store } from 'lucide-react'
import { CategoryStatus } from '@repo/types'
import { useAddressStore } from '@/stores/addressStore'
import { useBanners, useCategories } from '@/api/hooks/useCatalog'
import { useAvailableSellers } from '@/api/hooks/useSellers'
import { BannerCarousel } from '@/components/cards/BannerCarousel'
import { SellerCard, SellerCardSkeleton } from '@/components/cards/SellerCard'
import { Chip } from '@/components/ui/Chip'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { Spinner } from '@/components/ui/Spinner'
import { categoryIcon } from '@/lib/constants'
import { greeting, toNum } from '@/lib/format'
import { cn } from '@/lib/cn'

type Sort = 'nearest' | 'rating' | 'newest'
const sortPills: { key: Sort; label: string }[] = [
  { key: 'nearest', label: 'Nearest' },
  { key: 'rating', label: 'Top rated' },
  { key: 'newest', label: 'Newest' },
]

export function HomePage() {
  const navigate = useNavigate()
  const address = useAddressStore((s) => s.selectedAddress)
  const lat = address?.latitude
  const lng = address?.longitude

  const [sort, setSort] = useState<Sort>('nearest')
  const [category, setCategory] = useState<string | undefined>(undefined)

  const banners = useBanners()
  const categories = useCategories()
  const sellers = useAvailableSellers({ lat, lng, category })

  // `/sellers` has no sort param — apply the sort pill client-side over loaded pages.
  const allSellers = useMemo(() => {
    const list = sellers.data?.pages.flat() ?? []
    const sorted = [...list]
    if (sort === 'rating') {
      sorted.sort((a, b) => toNum(b.rating) - toNum(a.rating))
    } else if (sort === 'newest') {
      sorted.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
    } else {
      sorted.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity))
    }
    return sorted
  }, [sellers.data, sort])

  // Infinite scroll sentinel.
  const sentinel = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = sentinel.current
    if (!el) return
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && sellers.hasNextPage && !sellers.isFetchingNextPage) {
          sellers.fetchNextPage()
        }
      },
      { rootMargin: '300px' },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [sellers])

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="px-5 pb-28 pt-3"
    >
      <div>
        <p className="text-[11px] font-bold tracking-[0.08em] text-text-3">{greeting()}</p>
        <h1 className="text-title-lg font-bold text-text">What do you need today?</h1>
      </div>

      <button
        type="button"
        onClick={() => navigate('/search')}
        className="mt-4 flex w-full items-center gap-2.5 rounded-md border-[1.5px] border-border bg-surface px-3.5 py-3 text-left text-text-3"
      >
        <Search size={20} />
        <span className="text-body">Search printing, gifts, groceries…</span>
      </button>

      {/* Categories */}
      <div className="no-scrollbar mt-4 flex gap-3 overflow-x-auto">
        {categories.isLoading &&
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex shrink-0 flex-col items-center gap-1.5">
              <Skeleton className="h-16 w-16 rounded-lg" />
              <Skeleton className="h-3 w-12" />
            </div>
          ))}
        {categories.data?.map((c) => {
          const Icon = categoryIcon(c.id)
          const active = c.status === CategoryStatus.ACTIVE
          const selected = category === c.id
          return (
            <button
              key={c.id}
              type="button"
              disabled={!active}
              onClick={() => setCategory(selected ? undefined : c.id)}
              className="flex shrink-0 flex-col items-center gap-1.5"
            >
              <span
                className={cn(
                  'relative grid h-16 w-16 place-items-center rounded-lg border-[1.5px] transition-colors',
                  selected ? 'border-primary bg-primary-soft text-on-primary-soft' : 'border-border bg-surface text-primary',
                  !active && 'opacity-60',
                )}
              >
                <Icon size={24} />
                {!active && (
                  <span className="absolute -bottom-1 rounded-full bg-warning-soft px-1.5 text-[8px] font-bold text-warning">
                    SOON
                  </span>
                )}
              </span>
              <span className={cn('text-caption font-medium', selected ? 'text-primary' : 'text-text-2')}>
                {c.name}
              </span>
            </button>
          )
        })}
      </div>

      {/* Banners */}
      <div className="mt-5">
        {banners.isLoading ? (
          <Skeleton className="h-[140px] w-full rounded-lg" />
        ) : (
          banners.data && <BannerCarousel banners={banners.data} />
        )}
      </div>

      {/* Sort */}
      <div className="no-scrollbar mt-5 flex items-center gap-2 overflow-x-auto">
        {sortPills.map((p) => (
          <Chip key={p.key} active={sort === p.key} onClick={() => setSort(p.key)}>
            {p.label}
          </Chip>
        ))}
      </div>

      {/* Sellers */}
      <div className="mt-4 space-y-4">
        {!lat || !lng ? (
          <EmptyState
            icon={<Store size={34} />}
            title="Set your location"
            description="Choose a delivery address to discover shops near you."
          />
        ) : sellers.isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <SellerCardSkeleton key={i} />)
        ) : sellers.isError ? (
          <ErrorState message="Couldn't load shops near you." onRetry={() => sellers.refetch()} />
        ) : allSellers.length === 0 ? (
          <EmptyState
            icon={<Store size={34} />}
            title="No shops in your area"
            description="We're expanding fast. Try a different location or check back soon."
          />
        ) : (
          <>
            {allSellers.map((s) => (
              <SellerCard key={s.id} seller={s} />
            ))}
            <div ref={sentinel} className="flex justify-center py-4">
              {sellers.isFetchingNextPage && <Spinner />}
            </div>
          </>
        )}
      </div>
    </motion.div>
  )
}
