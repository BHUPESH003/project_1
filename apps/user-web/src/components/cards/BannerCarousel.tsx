import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/cn'
import { assetUrl } from '@/lib/format'
import type { Banner } from '@/api/types'

/** Auto-scrolling promotional banner carousel. */
export function BannerCarousel({ banners }: { banners: Banner[] }) {
  const [index, setIndex] = useState(0)
  const trackRef = useRef<HTMLDivElement>(null)
  const count = banners.length

  useEffect(() => {
    if (count <= 1) return
    const t = setInterval(() => setIndex((i) => (i + 1) % count), 4000)
    return () => clearInterval(t)
  }, [count])

  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    const child = track.children[index] as HTMLElement | undefined
    if (!child) return
    // Scroll the track itself (not scrollIntoView, which scrolls ancestors/the
    // window and fails to advance the carousel when the frame is centered on
    // desktop). Aligns the active slide's left edge to the track's left edge.
    const left = track.scrollLeft + (child.getBoundingClientRect().left - track.getBoundingClientRect().left)
    track.scrollTo({ left, behavior: 'smooth' })
  }, [index])

  if (!count) return null

  return (
    <div>
      <div
        ref={trackRef}
        className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto"
        onScroll={(e) => {
          const el = e.currentTarget
          const i = Math.round(el.scrollLeft / (el.clientWidth * 0.9))
          if (i !== index) setIndex(Math.min(i, count - 1))
        }}
      >
        {banners.map((b) => {
          const img = assetUrl(b.imagePath, b.imageUrl)
          return (
            <div
              key={b.id}
              className="relative h-[140px] w-[90%] shrink-0 snap-start overflow-hidden rounded-lg"
              style={{ background: img ? undefined : 'var(--grad-primary)' }}
            >
              {img && <img src={img} alt={b.title} className="absolute inset-0 h-full w-full object-cover" />}
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
              <div className="absolute inset-0 flex flex-col justify-end p-4 text-white">
                {b.badge && (
                  <span className="mb-1 w-fit rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold tracking-wide backdrop-blur">
                    {b.badge}
                  </span>
                )}
                <h3 className="text-title-lg font-bold leading-tight">{b.title}</h3>
                {b.subtitle && <p className="text-subhead opacity-90">{b.subtitle}</p>}
              </div>
            </div>
          )
        })}
      </div>
      {count > 1 && (
        <div className="mt-2.5 flex justify-center gap-1.5">
          {banners.map((b, i) => (
            <span
              key={b.id}
              className={cn(
                'h-1.5 rounded-full transition-all',
                i === index ? 'w-5 bg-primary' : 'w-1.5 bg-border-strong',
              )}
            />
          ))}
        </div>
      )}
    </div>
  )
}
