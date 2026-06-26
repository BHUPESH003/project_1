import { motion } from 'framer-motion'
import { MapPin, Store } from 'lucide-react'
import { Rating } from '@/components/ui/Rating'
import { cn } from '@/lib/cn'
import type { UnverifiedSeller } from '@/api/types'

export function UnverifiedSellerCard({ seller }: { seller: UnverifiedSeller }) {
  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm"
    >
      <div className="relative h-27.5 w-full bg-surface-3">
        {seller.photoUrl ? (
          <img src={seller.photoUrl} alt={seller.name} className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center text-text-3">
            <Store size={32} />
          </div>
        )}
        <span className="absolute left-3 top-3 rounded-full bg-surface/80 px-2.5 py-1 text-caption font-semibold text-text-2 backdrop-blur-sm">
          Not on platform
        </span>
      </div>

      <div className="p-3.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-title font-bold text-text line-clamp-1">{seller.name}</h3>
          {seller.rating != null && <Rating value={seller.rating} size="sm" className="shrink-0" />}
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-subhead text-text-2">
          {seller.openNow != null && (
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-caption font-semibold',
                seller.openNow ? 'bg-success-soft text-success' : 'bg-surface-2 text-text-3',
              )}
            >
              <span className={cn('h-1.5 w-1.5 rounded-full', seller.openNow ? 'bg-success pulse-dot' : 'bg-text-3')} />
              {seller.openNow ? 'Open' : 'Closed'}
            </span>
          )}
        </div>
        <div className="mt-2 flex items-start gap-1">
          <MapPin size={12} className="mt-0.5 shrink-0 text-text-3" />
          <p className="text-caption text-text-3 line-clamp-1">{seller.address}</p>
        </div>
      </div>
    </motion.div>
  )
}
