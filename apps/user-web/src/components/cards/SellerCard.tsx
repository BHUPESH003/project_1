import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Heart, Store } from 'lucide-react'
import { Icon } from '@repo/icons'
import { Rating } from '@/components/ui/Rating'
import { useToggleFavorite } from '@/api/hooks/useFavorites'
import { useAuthStore } from '@/stores/authStore'
import { assetUrl, distance, minutes, money, toNum } from '@/lib/format'
import { cn } from '@/lib/cn'
import type { Seller } from '@/api/types'

export function SellerCard({ seller }: { seller: Seller }) {
  const navigate = useNavigate()
  const isAuthed = useAuthStore((s) => s.isAuthenticated)
  const toggleFav = useToggleFavorite()
  const isOnline = seller.status === 'ONLINE'
  const cover = assetUrl(seller.imagePath, seller.imageUrl)
  const isFav = !!seller.isFavorite
  const discount = seller.discountPercent ? toNum(seller.discountPercent) : 0

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.98 }}
      onClick={() => navigate(`/sellers/${seller.id}`)}
      className="block w-full overflow-hidden rounded-lg border border-border bg-surface text-left shadow-sm"
    >
      <div className="relative h-27.5 w-full bg-surface-3">
        {cover ? (
          <img src={cover} alt={seller.shopName} className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center text-text-3">
            <Store size={32} />
          </div>
        )}
        {discount > 0 && (
          <span
            className="absolute left-3 top-3 rounded-full px-2.5 py-1 text-caption font-bold text-on-accent"
            style={{ background: 'var(--grad-accent)' }}
          >
            {Math.round(discount)}% off print
          </span>
        )}
        <button
          type="button"
          aria-label={isFav ? 'Remove favourite' : 'Add favourite'}
          onClick={(e) => {
            e.stopPropagation()
            if (!isAuthed) return
            toggleFav.mutate({ sellerId: seller.id, isFavorite: isFav })
          }}
          className="glass absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full"
        >
          <Heart size={18} className={cn(isFav ? 'fill-danger text-danger' : 'text-text-2')} />
        </button>
      </div>

      <div className="p-3.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-title font-bold text-text">{seller.shopName}</h3>
          <Rating value={seller.rating} size="sm" className="shrink-0" />
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-subhead text-text-2">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-caption font-semibold',
              isOnline ? 'bg-success-soft text-success' : 'bg-surface-2 text-text-3',
            )}
          >
            <span className={cn('h-1.5 w-1.5 rounded-full', isOnline ? 'bg-success pulse-dot' : 'bg-text-3')} />
            {isOnline ? 'Open' : 'Closed'}
          </span>
          {(seller.estimatedDeliveryTimeMins ?? seller.prepTimeMinutes) != null && (
            <>
              <span className="text-text-3">·</span>
              <span className="inline-flex items-center gap-1">
                <Icon name="truck" size={13} />
                {minutes(seller.estimatedDeliveryTimeMins ?? seller.prepTimeMinutes)}
              </span>
            </>
          )}
          {seller.distanceKm != null && (
            <>
              <span className="text-text-3">·</span>
              <span className="mono-num">{distance(seller.distanceKm)}</span>
            </>
          )}
        </div>
        {seller.startingPrice != null && (
          <p className="mt-1.5 text-caption text-text-2">
            Starting <span className="font-bold text-text mono-num">{money(seller.startingPrice)}</span>
          </p>
        )}
      </div>
    </motion.button>
  )
}

export function SellerCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      <div className="skeleton h-27.5 w-full rounded-none" />
      <div className="space-y-2 p-3.5">
        <div className="flex justify-between">
          <div className="skeleton h-4 w-32" />
          <div className="skeleton h-4 w-10" />
        </div>
        <div className="skeleton h-3 w-44" />
        <div className="skeleton h-3 w-24" />
      </div>
    </div>
  )
}
