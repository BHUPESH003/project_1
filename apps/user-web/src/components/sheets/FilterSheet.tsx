import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Star } from 'lucide-react'
import { BottomSheet } from './BottomSheet'
import { Chip } from '@/components/ui/Chip'
import { Button } from '@/components/ui/Button'

/* eslint-disable react-refresh/only-export-components */
/** Discovery filters applied to the home seller list (all backend-supported). */
export interface SellerFilters {
  sort: 'nearest' | 'rating' | 'newest'
  hasOffers: boolean
  minRating?: number
  maxDistanceKm?: number
}

export const DEFAULT_SELLER_FILTERS: SellerFilters = {
  sort: 'nearest',
  hasOffers: false,
}

/** Count of filters that differ from the defaults (drives the pill badge). */
export function activeFilterCount(f: SellerFilters): number {
  return (
    (f.sort !== 'nearest' ? 1 : 0) +
    (f.hasOffers ? 1 : 0) +
    (f.minRating != null ? 1 : 0) +
    (f.maxDistanceKm != null ? 1 : 0)
  )
}

const SORTS: { key: SellerFilters['sort']; label: string }[] = [
  { key: 'nearest', label: 'Nearest' },
  { key: 'rating', label: 'Top rated' },
  { key: 'newest', label: 'Newest' },
]
const DISTANCES: { value: number | undefined; label: string }[] = [
  { value: undefined, label: 'Any' },
  { value: 1, label: 'Within 1 km' },
  { value: 3, label: 'Within 3 km' },
  { value: 5, label: 'Within 5 km' },
]
const RATINGS: { value: number | undefined; label: string }[] = [
  { value: undefined, label: 'Any' },
  { value: 4, label: '4.0+' },
  { value: 4.5, label: '4.5+' },
]

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="py-3">
      <p className="mb-2.5 text-micro font-bold uppercase tracking-[0.06em] text-text-3">{title}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  )
}

export function FilterSheet({
  open,
  onOpenChange,
  value,
  onApply,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  value: SellerFilters
  onApply: (f: SellerFilters) => void
}) {
  // Draft so changes only take effect on "Apply"; reseed each time it opens.
  const [draft, setDraft] = useState<SellerFilters>(value)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open) setDraft(value)
  }, [open, value])

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title="Filters">
      <div className="divide-y divide-border-faint">
        <Section title="Sort by">
          {SORTS.map((s) => (
            <Chip key={s.key} active={draft.sort === s.key} onClick={() => setDraft((d) => ({ ...d, sort: s.key }))}>
              {s.label}
            </Chip>
          ))}
        </Section>

        <Section title="Distance">
          {DISTANCES.map((d) => (
            <Chip
              key={d.label}
              active={draft.maxDistanceKm === d.value}
              onClick={() => setDraft((prev) => ({ ...prev, maxDistanceKm: d.value }))}
            >
              {d.label}
            </Chip>
          ))}
        </Section>

        <Section title="Rating">
          {RATINGS.map((r) => (
            <Chip
              key={r.label}
              active={draft.minRating === r.value}
              icon={r.value != null ? <Star size={13} className="fill-current" /> : undefined}
              onClick={() => setDraft((prev) => ({ ...prev, minRating: r.value }))}
            >
              {r.label}
            </Chip>
          ))}
        </Section>

        <Section title="Offers">
          <Chip active={draft.hasOffers} onClick={() => setDraft((d) => ({ ...d, hasOffers: !d.hasOffers }))}>
            Only shops with offers
          </Chip>
        </Section>
      </div>

      <div className="mt-3 flex gap-3 pt-1">
        <Button
          variant="secondary"
          className="flex-1"
          onClick={() => setDraft(DEFAULT_SELLER_FILTERS)}
        >
          Clear all
        </Button>
        <Button
          className="flex-1"
          onClick={() => {
            onApply(draft)
            onOpenChange(false)
          }}
        >
          Apply
        </Button>
      </div>
    </BottomSheet>
  )
}
