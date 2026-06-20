import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as Dialog from '@radix-ui/react-dialog'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Search, X, SearchX, Store, Clock } from 'lucide-react'
import { useSearchStore } from '@/stores/searchStore'
import { useSearch } from '@/api/hooks/useSearch'
import { useDebounce } from '@/hooks/useDebounce'
import { SellerCard, SellerCardSkeleton } from '@/components/cards/SellerCard'
import { Price } from '@/components/ui/Price'
import { EmptyState } from '@/components/ui/States'
import { assetUrl } from '@/lib/format'

/**
 * Full-screen search overlay — opened by the home/compact header search bar
 * and the bottom-nav Search tab. Persists recent searches to localStorage.
 * No dedicated /search route needed.
 */
export function SearchOverlay() {
  const navigate = useNavigate()
  const { isSearchOpen, closeSearch, recentSearches, addSearch, removeSearch, clearSearches } =
    useSearchStore()

  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const debounced = useDebounce(query, 300)

  const { data, isFetching } = useSearch(debounced)
  const sellers = data?.sellers ?? []
  const products = data?.products ?? []
  const hasQuery = debounced.trim().length >= 2
  const noResults = hasQuery && !isFetching && sellers.length === 0 && products.length === 0

  // Save to recent searches when real results arrive
  useEffect(() => {
    if (hasQuery && (sellers.length > 0 || products.length > 0)) {
      addSearch(debounced.trim())
    }
  }, [debounced, hasQuery, sellers.length, products.length, addSearch])

  // Clear query when overlay closes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!isSearchOpen) setQuery('')
  }, [isSearchOpen])

  function handleClose() {
    closeSearch()
  }

  function handleProductClick(sellerId: string) {
    navigate(`/sellers/${sellerId}`)
    handleClose()
  }

  function handleSellerClick(sellerId: string) {
    navigate(`/sellers/${sellerId}`)
    handleClose()
  }

  return (
    <Dialog.Root open={isSearchOpen} onOpenChange={(o) => !o && handleClose()}>
      <AnimatePresence>
        {isSearchOpen && (
          <Dialog.Portal forceMount>
            <Dialog.Title className="sr-only">Search</Dialog.Title>
            <Dialog.Content
              asChild
              onEscapeKeyDown={handleClose}
              onInteractOutside={(e) => e.preventDefault()}
            >
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="fixed bottom-0 left-1/2 top-0 z-100 flex w-full max-w-107.5 -translate-x-1/2 flex-col bg-bg"
              >
                {/* ── Input row ── */}
                <div
                  className="flex shrink-0 items-center gap-2 border-b border-border-faint px-3 pb-3"
                  style={{ paddingTop: 'max(14px, env(safe-area-inset-top))' }}
                >
                  <button
                    type="button"
                    onClick={handleClose}
                    aria-label="Close search"
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-text-2 tap"
                  >
                    <ArrowLeft size={20} />
                  </button>

                  <div className="flex flex-1 items-center gap-2 rounded-full border border-primary bg-surface px-3 py-2 shadow-sm">
                    <Search size={15} className="shrink-0 text-text-3" />
                    <input
                      ref={inputRef}
                      autoFocus
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search printing, gifts, groceries…"
                      className="min-w-0 flex-1 bg-transparent text-body text-text outline-none placeholder:text-text-3"
                    />
                    {query && (
                      <button
                        type="button"
                        onClick={() => setQuery('')}
                        className="shrink-0 text-text-3"
                        aria-label="Clear"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* ── Results / recent ── */}
                <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-[max(20px,env(safe-area-inset-bottom))]">

                  {/* Recent searches — idle state */}
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
                          <div
                            key={s}
                            className="flex items-center gap-1 rounded-full border border-border bg-surface px-3 py-1.5"
                          >
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

                  {/* Empty idle prompt */}
                  {!hasQuery && recentSearches.length === 0 && (
                    <EmptyState
                      icon={<Search size={32} />}
                      title="Find anything nearby"
                      description="Search for shops or products — printing, stationery, gifts and more."
                    />
                  )}

                  {/* Loading skeletons */}
                  {hasQuery && isFetching && !data && (
                    <div className="mt-5 space-y-4">
                      <SellerCardSkeleton />
                      <SellerCardSkeleton />
                    </div>
                  )}

                  {/* No results */}
                  {noResults && (
                    <EmptyState
                      icon={<SearchX size={32} />}
                      title="No results found"
                      description={`Nothing matched "${debounced}". Try a different term.`}
                    />
                  )}

                  {/* Shops */}
                  {hasQuery && sellers.length > 0 && (
                    <section className="mt-5">
                      <h2 className="mb-3 text-subhead font-bold uppercase tracking-wide text-text-3">
                        Shops
                      </h2>
                      <div className="space-y-4">
                        {sellers.map((s) => (
                          <div
                            key={s.id}
                            onClick={() => handleSellerClick(s.id)}
                            className="cursor-pointer"
                          >
                            <SellerCard seller={s} />
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Products */}
                  {hasQuery && products.length > 0 && (
                    <section className="mt-6">
                      <h2 className="mb-2 text-subhead font-bold uppercase tracking-wide text-text-3">
                        Products
                      </h2>
                      <div className="divide-y divide-border-faint">
                        {products.map((p) => {
                          const img = assetUrl(p.image, undefined)
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => handleProductClick(p.sellerId)}
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
                                {p.seller?.shopName && (
                                  <p className="truncate text-caption text-text-2">
                                    {p.seller.shopName}
                                  </p>
                                )}
                                <Price amount={p.price} mrp={p.mrp} size="sm" className="mt-0.5" />
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </section>
                  )}
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  )
}
