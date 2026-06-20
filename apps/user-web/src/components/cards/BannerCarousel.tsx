import { assetUrl } from '@/lib/format'
import type { Banner } from '@/api/types'

/**
 * Promotional banners rendered as a horizontal rail of tall, vertical cards
 * (~2.5 visible at a time). Snap-scrolling, no auto-advance — the cards are
 * meant to be browsed, like a shelf of offers.
 */
export function BannerCarousel({ banners }: { banners: Banner[] }) {
  if (!banners.length) return null

  return (
    <div className="no-scrollbar -mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5">
      {banners.map((b) => {
        const img = assetUrl(b.imagePath, b.imageUrl)
        return (
          <div
            key={b.id}
            className="relative aspect-[3/4] w-[132px] shrink-0 snap-start overflow-hidden rounded-2xl shadow-sm"
            style={{ background: img ? undefined : 'var(--grad-primary)' }}
          >
            {img && <img src={img} alt={b.title} className="absolute inset-0 h-full w-full object-cover" />}
            <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
            {b.badge && (
              <span
                className="absolute left-2.5 top-2.5 w-fit rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-on-accent shadow-sm"
                style={{ background: 'var(--grad-accent)' }}
              >
                {b.badge}
              </span>
            )}
            <div className="absolute inset-x-0 bottom-0 p-2.5 text-white">
              <h3 className="text-subhead font-bold leading-tight line-clamp-2">{b.title}</h3>
              {b.subtitle && (
                <p className="mt-0.5 text-micro leading-tight opacity-90 line-clamp-1">{b.subtitle}</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
