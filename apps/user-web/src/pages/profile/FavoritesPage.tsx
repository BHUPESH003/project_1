import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Heart } from 'lucide-react'
import { useFavorites } from '@/api/hooks/useFavorites'
import { SellerCard, SellerCardSkeleton } from '@/components/cards/SellerCard'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { Button } from '@/components/ui/Button'

export function FavoritesPage() {
  const navigate = useNavigate()
  const { data, isLoading, isError, refetch } = useFavorites()

  return (
    <div className="px-5 pb-28 pt-3">
      <div className="mb-3 flex items-center gap-2">
        <button onClick={() => navigate(-1)} aria-label="Back" className="tap -ml-2 grid h-10 w-10 place-items-center text-text-2">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-title-lg font-bold text-text">Favourites</h1>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <SellerCardSkeleton />
          <SellerCardSkeleton />
        </div>
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} message="Couldn't load favourites." />
      ) : !data?.length ? (
        <EmptyState
          icon={<Heart size={32} />}
          title="No favourites yet"
          description="Tap the heart on a shop to save it here."
          action={<Button onClick={() => navigate('/')}>Explore shops</Button>}
        />
      ) : (
        <div className="space-y-4">
          {data.map((s) => (
            <SellerCard key={s.id} seller={{ ...s, isFavorite: true }} />
          ))}
        </div>
      )}
    </div>
  )
}
