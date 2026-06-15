import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Package, Plus, Search } from 'lucide-react'
import { Field } from '@/components/ui/Field'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { ProductCard } from '@/components/products/ProductCard'
import { useProducts, useUpdateProduct } from '@/api/hooks/useProducts'
import { getErrorMessage } from '@/api/client'
import { toast } from '@/stores/toastStore'
import { cn } from '@/lib/cn'

type StockFilter = 'all' | 'in' | 'out'

export function ProductListPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<StockFilter>('all')
  const { data, isLoading, error, refetch } = useProducts()
  const update = useUpdateProduct()
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const items = useMemo(() => {
    let list = data?.items ?? []
    const q = search.trim().toLowerCase()
    if (q) list = list.filter((p) => p.name.toLowerCase().includes(q))
    if (filter === 'in') list = list.filter((p) => p.inStock)
    if (filter === 'out') list = list.filter((p) => !p.inStock)
    return list
  }, [data, search, filter])

  async function toggleStock(id: string, inStock: boolean) {
    setTogglingId(id)
    try {
      await update.mutateAsync({ id, input: { inStock } })
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setTogglingId(null)
    }
  }

  const tabs: { key: StockFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'in', label: 'In stock' },
    { key: 'out', label: 'Out of stock' },
  ]

  return (
    <div>
      <header className="sticky top-0 z-30 border-b border-border bg-surface/95 px-4 py-3 backdrop-blur-md">
        <h1 className="text-title font-extrabold text-text">Products</h1>
      </header>

      <div className="px-4 pb-24">
        <div className="mt-4">
          <Field
            placeholder="Search your products"
            leading={<Search size={18} />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="mt-3 flex gap-2">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className={cn(
                'rounded-full border px-3.5 py-1.5 text-caption font-semibold transition-colors',
                filter === t.key
                  ? 'border-primary bg-primary text-on-primary'
                  : 'border-border bg-surface text-text-2',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="mt-4 grid grid-cols-2 gap-3">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-52 w-full rounded-2xl" />
            ))}
          </div>
        ) : error ? (
          <ErrorState message={getErrorMessage(error)} onRetry={() => refetch()} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={<Package size={34} />}
            title={search ? 'No matches' : 'No products yet'}
            description={search ? 'Try a different search.' : 'Add your first product to start selling.'}
          />
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3">
            {items.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                toggling={togglingId === p.id}
                onToggleStock={(inStock) => toggleStock(p.id, inStock)}
              />
            ))}
          </div>
        )}
      </div>

      {/* FAB — anchored to the right edge of the phone frame */}
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(76px+env(safe-area-inset-bottom))] z-30 mx-auto flex max-w-[430px] justify-end px-4">
        <button
          onClick={() => navigate('/products/new')}
          aria-label="Add product"
          className="tap pointer-events-auto flex items-center gap-1.5 rounded-full px-5 py-3.5 text-on-primary shadow-float"
          style={{ background: 'var(--grad-primary)' }}
        >
          <Plus size={20} />
          <span className="text-subhead font-bold">Add</span>
        </button>
      </div>
    </div>
  )
}
