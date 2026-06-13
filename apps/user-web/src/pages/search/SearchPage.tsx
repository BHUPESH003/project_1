import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search as SearchIcon, X, SearchX, Store } from 'lucide-react'
import { Field } from '@/components/ui/Field'
import { SellerCard, SellerCardSkeleton } from '@/components/cards/SellerCard'
import { Price } from '@/components/ui/Price'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { useSearch } from '@/api/hooks/useSearch'
import { useDebounce } from '@/hooks/useDebounce'
import { assetUrl } from '@/lib/format'

export function SearchPage() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const debounced = useDebounce(query, 300)
  const { data, isFetching, isError, refetch } = useSearch(debounced)

  const hasQuery = debounced.trim().length >= 2
  const sellers = data?.sellers ?? []
  const products = data?.products ?? []
  const noResults = hasQuery && !isFetching && sellers.length === 0 && products.length === 0

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

      {!hasQuery && (
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
