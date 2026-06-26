import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { SlidersHorizontal, Store } from 'lucide-react'
import { Icon } from '@repo/icons'
import { CategoryStatus } from '@repo/types'
import { useAddressStore } from '@/stores/addressStore'
import { useDiscoveryStore } from '@/stores/discoveryStore'
import { useBanners, useCategories } from '@/api/hooks/useCatalog'
import { useAvailableSellers, useDiscoverySellers } from '@/api/hooks/useSellers'
import { BannerCarousel } from '@/components/cards/BannerCarousel'
import { SubcategoryBanner } from '@/components/home/SubcategoryBanner'
import { SellerCard, SellerCardSkeleton } from '@/components/cards/SellerCard'
import { UnverifiedSellerCard } from '@/components/cards/UnverifiedSellerCard'
import {
  FilterSheet,
  DEFAULT_SELLER_FILTERS,
  activeFilterCount,
  type SellerFilters,
} from '@/components/sheets/FilterSheet'
import { Chip } from '@/components/ui/Chip'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { Spinner } from '@/components/ui/Spinner'
import { categoryIcon } from '@/lib/constants'
import { cn } from '@/lib/cn'

export function HomePage() {
  const address = useAddressStore((s) => s.selectedAddress)
  const setNearestEta = useDiscoveryStore((s) => s.setNearestEta)
  const lat = address?.latitude
  const lng = address?.longitude

  const [category, setCategory] = useState<string | undefined>(undefined)
  const [filters, setFilters] = useState<SellerFilters>(DEFAULT_SELLER_FILTERS)
  const [filterOpen, setFilterOpen] = useState(false)

  const banners = useBanners()
  const categories = useCategories()
  const discovery = useDiscoverySellers(lat, lng, category)
  const unverified = discovery.data ?? []

  const sellers = useAvailableSellers({
    lat,
    lng,
    category,
    sort: filters.sort,
    hasOffers: filters.hasOffers,
    minRating: filters.minRating,
    maxDistanceKm: filters.maxDistanceKm,
  })

  const allSellers = useMemo(() => sellers.data?.pages.flat() ?? [], [sellers.data])

  // Publish the nearest seller's delivery ETA for the hero header. Computed from
  // the closest loaded seller regardless of the active sort. Cleared on unmount
  // so a stale ETA doesn't flash when returning to home.
  useEffect(() => {
    if (!allSellers.length) {
      setNearestEta(null)
      return
    }
    const nearest = allSellers.reduce((closest, s) =>
      (s.distanceKm ?? Infinity) < (closest.distanceKm ?? Infinity) ? s : closest,
    )
    setNearestEta(nearest.estimatedDeliveryTimeMins ?? nearest.prepTimeMinutes ?? null)
  }, [allSellers, setNearestEta])
  useEffect(() => () => setNearestEta(null), [setNearestEta])

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

  const catItems = [
    { id: undefined as string | undefined, name: 'All', iconName: 'grid' as const, active: true },
    ...(categories.data ?? []).map((c) => ({
      id: c.id as string | undefined,
      name: c.name,
      iconName: categoryIcon(c.id),
      active: c.status === CategoryStatus.ACTIVE,
    })),
  ]

  const filterCount = activeFilterCount(filters)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="px-5 pb-28 pt-4"
    >
      {/* Categories — every tile is a fixed w-16 (64px) column so all items
          align regardless of label length. Long names wrap to 2 lines within
          the fixed width, which reads as intentional rather than messy. */}
      <div className="no-scrollbar -mx-5 flex gap-3 overflow-x-auto px-5">
        {categories.isLoading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex w-16 shrink-0 flex-col items-center gap-1.5">
                <Skeleton className="h-12 w-12 rounded-2xl" />
                <Skeleton className="h-3 w-10" />
              </div>
            ))
          : catItems.map((c) => {
              const selected = category === c.id
              return (
                <button
                  key={c.name}
                  type="button"
                  disabled={!c.active}
                  onClick={() => setCategory(c.id)}
                  className="flex w-16 shrink-0 flex-col items-center gap-1"
                >
                  <span
                    className={cn(
                      'relative grid h-12 w-12 place-items-center rounded-2xl transition-colors',
                      selected ? 'bg-primary text-on-primary' : 'bg-surface-2 text-primary',
                      !c.active && 'opacity-50',
                    )}
                  >
                    <Icon name={c.iconName} size={20} strokeWidth={1.8} />
                    {!c.active && (
                      <span className="absolute -bottom-1 rounded-full bg-warning-soft px-1.5 text-[8px] font-bold text-warning">
                        SOON
                      </span>
                    )}
                  </span>
                  <span
                    className={cn(
                      'w-full text-center text-[10px] font-medium leading-tight line-clamp-2',
                      selected ? 'text-primary' : 'text-text-2',
                    )}
                  >
                    {c.name}
                  </span>
                  <span
                    className={cn(
                      'h-0.5 w-4 rounded-full transition-colors',
                      selected ? 'bg-primary' : 'bg-transparent',
                    )}
                  />
                </button>
              )
            })}
      </div>

      {/* Subcategory chips — only shown when a category filter is active */}
      {category && (
        <div className="mt-4">
          <SubcategoryBanner categoryId={category} />
        </div>
      )}

      {/* Banners */}
      <div className="mt-5">
        {banners.isLoading ? (
          <div className="flex gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[3/4] w-[132px] shrink-0 rounded-2xl" />
            ))}
          </div>
        ) : (
          banners.data && <BannerCarousel banners={banners.data} />
        )}
      </div>

      {/* Filters */}
      <div className="no-scrollbar mt-5 flex items-center gap-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setFilterOpen(true)}
          className={cn(
            'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border-[1.5px] px-3.5 text-subhead font-semibold transition-colors',
            filterCount > 0
              ? 'border-primary bg-primary-soft text-on-primary-soft'
              : 'border-border bg-surface text-text',
          )}
        >
          <SlidersHorizontal size={15} />
          Filters
          {filterCount > 0 && (
            <span className="grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-on-primary mono-num">
              {filterCount}
            </span>
          )}
        </button>
        <Chip
          active={filters.sort === 'rating'}
          onClick={() => setFilters((f) => ({ ...f, sort: f.sort === 'rating' ? 'nearest' : 'rating' }))}
        >
          Top rated
        </Chip>
        <Chip
          active={filters.sort === 'newest'}
          onClick={() => setFilters((f) => ({ ...f, sort: f.sort === 'newest' ? 'nearest' : 'newest' }))}
        >
          New to you
        </Chip>
        <Chip active={filters.hasOffers} onClick={() => setFilters((f) => ({ ...f, hasOffers: !f.hasOffers }))}>
          Great offers
        </Chip>
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
            title={filterCount > 0 ? 'No shops match your filters' : 'No shops in your area'}
            description={
              filterCount > 0
                ? 'Try clearing a filter or two to see more shops.'
                : "We're expanding fast. Try a different location or check back soon."
            }
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

      {/* Nearby but not yet on platform */}
      {unverified.length > 0 && (
        <div className="mt-8">
          <p className="mb-3 text-caption font-bold uppercase tracking-wide text-text-3">
            Also nearby — not yet on Pelocal
          </p>
          <div className="space-y-4">
            {unverified.map((s) => (
              <UnverifiedSellerCard key={s.placeId} seller={s} />
            ))}
          </div>
        </div>
      )}

      <FilterSheet open={filterOpen} onOpenChange={setFilterOpen} value={filters} onApply={setFilters} />
    </motion.div>
  )
}
