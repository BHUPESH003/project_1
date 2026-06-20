import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Search as SearchIcon, X, SearchX, Store, Clock } from 'lucide-react'
import { Field } from '@/components/ui/Field'
import { SellerCard, SellerCardSkeleton } from '@/components/cards/SellerCard'
import { Price } from '@/components/ui/Price'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { useSearch } from '@/api/hooks/useSearch'
import { useSearchStore } from '@/stores/searchStore'
import { useDebounce } from '@/hooks/useDebounce'
import { assetUrl } from '@/lib/format'

export function SearchPage() {
  const navigate = useNavigate()
  const [sp] = useSearchParams()
  // Pre-fill from ?q= when navigating from the compact header search bar
  const [query, setQuery] = useState(() => sp.get('q') ?? '')
  const debounced = useDebounce(query, 300)
  const { data, isFetching, isError, refetch } = useSearch(debounced)

  const { recentSearches, addSearch, removeSearch, clearSearches } = useSearchStore()

  const hasQuery = debounced.trim().length >= 2
  const sellers = data?.sellers ?? []
  const products = data?.products ?? []
  const noResults = hasQuery && !isFetching && sellers.length === 0 && products.length === 0

  // Save to recent searches when results come back for a query
  useEffect(() => {
    if (hasQuery && data && (sellers.length > 0 || products.length > 0)) {
      addSearch(debounced.trim())
    }
  }, [debounced, data, hasQuery, sellers.length, products.length, addSearch])

  return (
    <div className="px-5 pb-28 pt-3">
      <Field
        autoFocus
        leading={<SearchIcon size={20} />}
        trailing={
          query ? (
            <button onClick={() => setQuery('')} aria-label="Clear">
              <X size={16} />
            </button>
          ) : undefined
        }
        placeholder="Search printing, gifts, groceries…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {/* Recent searches — shown only when search box is empty */}
      {!hasQuery && recentSearches.length > 0 && (
        <section className="mt-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-subhead font-bold text-text">Recent Searches</h2>
            <button
              type="button"
              onClick={clearSearches}
              className="text-caption font-semibold text-primary tap"
            >
              Clear
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {recentSearches.map((s) => (
              <div key={s} className="flex items-center gap-1 rounded-full border border-border bg-surface px-3 py-1.5">
                <button
                  type="button"
                  onClick={() => setQuery(s)}
                  className="flex items-center gap-1.5 text-caption text-text tap"
                >
                  <Clock size={12} className="shrink-0 text-text-3" />
                  {s}
                </button>
                <button
                  type="button"
                  onClick={() => removeSearch(s)}
                  className="ml-1 text-text-3 tap"
                  aria-label={`Remove ${s}`}
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {!hasQuery && recentSearches.length === 0 && (
        <EmptyState
          icon={<SearchIcon size={32} />}
          title="Find anything nearby"
          description="Search for shops or products — printing, stationery, gifts and more."
        />
      )}

      {hasQuery && isFetching && !data && (
        <div className="mt-5 space-y-4">
          <SellerCardSkeleton />
          <SellerCardSkeleton />
        </div>
      )}

      {hasQuery && isError && <ErrorState onRetry={() => refetch()} message="Search failed. Try again." />}

      {noResults && (
        <EmptyState
          icon={<SearchX size={32} />}
          title="No results found"
          description={`Nothing matched "${debounced}". Try a different term.`}
        />
      )}

      {hasQuery && sellers.length > 0 && (
        <section className="mt-5">
          <h2 className="mb-3 text-subhead font-bold uppercase tracking-wide text-text-3">Shops</h2>
          <div className="space-y-4">
            {sellers.map((s) => (
              <SellerCard key={s.id} seller={s} />
            ))}
          </div>
        </section>
      )}

      {hasQuery && products.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-subhead font-bold uppercase tracking-wide text-text-3">Products</h2>
          <div className="divide-y divide-border-faint">
            {products.map((p) => {
              const img = assetUrl(p.image, p.imageUrl)
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => navigate(`/sellers/${p.sellerId}`)}
                  className="tap flex w-full items-center gap-3 py-3 text-left"
                >
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md bg-surface-2">
                    {img ? (
                      <img src={img} alt={p.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-text-3">
                        <Store size={20} />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body font-semibold text-text">{p.name}</p>
                    {p.seller?.shopName && <p className="truncate text-caption text-text-2">{p.seller.shopName}</p>}
                    <Price amount={p.price} mrp={p.mrp} size="sm" className="mt-0.5" />
                  </div>
                </button>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
