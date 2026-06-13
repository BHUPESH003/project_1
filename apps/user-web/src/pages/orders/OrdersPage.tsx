import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Receipt } from 'lucide-react'
import { useOrders } from '@/api/hooks/useOrders'
import { OrderCard } from '@/components/cards/OrderCard'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { Button } from '@/components/ui/Button'
import { isActiveOrder } from '@/lib/constants'

export function OrdersPage() {
  const navigate = useNavigate()
  const { data, isLoading, isError, refetch } = useOrders()

  const { active, past } = useMemo(() => {
    const all = data ?? []
    return {
      active: all.filter((o) => isActiveOrder(o.status)),
      past: all.filter((o) => !isActiveOrder(o.status)),
    }
  }, [data])

  return (
    <div className="px-5 pb-28 pt-3">
      <h1 className="mb-3 text-title-lg font-bold text-text">Orders</h1>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} message="Couldn't load your orders." />
      ) : !data?.length ? (
        <EmptyState
          icon={<Receipt size={32} />}
          title="No orders yet"
          description="Your orders will show up here once you place one."
          action={<Button onClick={() => navigate('/')}>Browse shops</Button>}
        />
      ) : (
        <div className="space-y-6">
          {active.length > 0 && (
            <section>
              <h2 className="mb-2 flex items-center gap-2 text-subhead font-bold uppercase tracking-wide text-text-3">
                Active
                <span className="rounded-full bg-primary px-1.5 text-[10px] font-bold leading-4 text-on-primary mono-num">
                  {active.length}
                </span>
              </h2>
              <div className="space-y-3">
                {active.map((o) => (
                  <OrderCard key={o.id} order={o} prominent />
                ))}
              </div>
            </section>
          )}

          {past.length > 0 && (
            <section>
              <h2 className="mb-2 text-subhead font-bold uppercase tracking-wide text-text-3">Past orders</h2>
              <div className="space-y-2">
                {past.map((o) => (
                  <OrderCard key={o.id} order={o} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
