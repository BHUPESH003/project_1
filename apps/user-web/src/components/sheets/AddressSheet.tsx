import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  Navigation,
  Search,
  ChevronRight,
  Home as HomeIcon,
  Store,
  MapPin,
  ArrowLeft,
  Plus,
} from 'lucide-react'
import { BottomSheet } from './BottomSheet'
import { Field } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { useAddresses } from '@/api/hooks/useUser'
import { fetchPlaceDetails, useAutocomplete, useReverseGeocode } from '@/api/hooks/useLocation'
import { useGeolocation } from '@/hooks/useGeolocation'
import { useDebounce } from '@/hooks/useDebounce'
import { useAddressStore, type SelectedAddress } from '@/stores/addressStore'
import { toast } from '@/stores/toastStore'
import { toNum } from '@/lib/format'
import type { UserAddress } from '@/api/types'

type Step = 'list' | 'search' | 'confirm'

export function AddressSheet({
  open,
  onOpenChange,
  dismissible = true,
  onCommit,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  dismissible?: boolean
  /** Fires with the chosen location (called in addition to updating the store). */
  onCommit?: (addr: SelectedAddress) => void
}) {
  const qc = useQueryClient()
  const setAddress = useAddressStore((s) => s.setAddress)
  const { data: saved } = useAddresses()
  const geo = useGeolocation()

  const [step, setStep] = useState<Step>('list')
  const [query, setQuery] = useState('')
  const debounced = useDebounce(query, 300)
  const { data: predictions, isFetching } = useAutocomplete(debounced)

  // Pending coords drive the confirm step's reverse-geocode.
  const [pending, setPending] = useState<{ lat: number; lng: number; label?: string } | null>(null)
  const { data: geocoded, isLoading: geocoding } = useReverseGeocode(pending?.lat, pending?.lng)

  function commit(addr: SelectedAddress) {
    setAddress(addr)
    onCommit?.(addr)
    // Address drives seller discovery — refresh location-scoped queries.
    qc.invalidateQueries({ queryKey: ['sellers'] })
    qc.invalidateQueries({ queryKey: ['seller'] })
    reset()
    onOpenChange(false)
  }

  function reset() {
    setStep('list')
    setQuery('')
    setPending(null)
  }

  async function useCurrentLocation() {
    try {
      const { latitude, longitude } = await geo.getCurrentPosition()
      setPending({ lat: latitude, lng: longitude })
      setStep('confirm')
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  function pickSaved(a: UserAddress) {
    const lat = toNum(a.latitude, NaN)
    const lng = toNum(a.longitude, NaN)
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      toast.error('This address has no location set')
      return
    }
    commit({
      id: a.id,
      label: a.label,
      addressLine: a.addressLine,
      receiverName: a.receiverName,
      receiverPhone: a.receiverPhone,
      latitude: lat,
      longitude: lng,
    })
  }

  function savedIcon(label: string) {
    const l = label.toLowerCase()
    if (l.includes('home')) return HomeIcon
    if (l.includes('office') || l.includes('work')) return Store
    return MapPin
  }

  return (
    <BottomSheet
      open={open}
      onOpenChange={(o) => {
        if (!o) reset()
        onOpenChange(o)
      }}
      dismissible={dismissible}
      title={step === 'confirm' ? undefined : step === 'search' ? undefined : 'Set your delivery location'}
    >
      {step === 'list' && (
        <div className="flex flex-col gap-3.5 pb-2">
          <p className="-mt-1 text-subhead text-text-2">
            Sellers, delivery &amp; pricing depend on where you are.
          </p>

          <button
            type="button"
            onClick={useCurrentLocation}
            disabled={geo.loading}
            className="tap flex items-center gap-3 rounded-md border-[1.5px] border-primary-soft-border bg-primary-soft px-4 py-3.5 text-left"
          >
            <span className="grid h-10 w-10 place-items-center rounded-full bg-primary text-on-primary">
              {geo.loading ? <Spinner /> : <Navigation size={20} />}
            </span>
            <span className="flex-1">
              <span className="block text-body font-semibold text-text">Use current location</span>
              <span className="block text-caption text-text-2">Using GPS</span>
            </span>
            <ChevronRight size={20} className="text-text-3" />
          </button>

          <button
            type="button"
            onClick={() => setStep('search')}
            className="flex items-center gap-2.5 rounded-md border-[1.5px] border-border bg-surface px-3.5 py-3 text-left text-text-3"
          >
            <Search size={20} />
            <span className="text-body">Search for area, street name…</span>
          </button>

          {!!saved?.length && (
            <div className="flex flex-col gap-1">
              <span className="mt-1 px-0.5 text-[11px] font-bold tracking-[0.06em] text-text-3">
                SAVED ADDRESSES
              </span>
              {saved.map((a) => {
                const Icon = savedIcon(a.label)
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => pickSaved(a)}
                    className="tap flex items-start gap-3 rounded-md px-1 py-2.5 text-left hover:bg-surface-2"
                  >
                    <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-2 text-primary">
                      <Icon size={18} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-body font-semibold text-text">{a.label}</span>
                      <span className="block truncate text-subhead text-text-2">{a.addressLine}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {step === 'search' && (
        <div className="flex flex-col gap-3 pb-2">
          <div className="flex items-center gap-2">
            <button onClick={() => setStep('list')} aria-label="Back" className="tap text-text-2">
              <ArrowLeft size={22} />
            </button>
            <span className="text-title font-bold text-text">Search location</span>
          </div>
          <Field
            autoFocus
            leading={<Search size={20} />}
            trailing={isFetching ? <Spinner size={16} /> : undefined}
            placeholder="Search for area, street name…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="flex flex-col">
            {predictions?.map((p) => (
              <button
                key={p.placeId}
                type="button"
                onClick={async () => {
                  let lat = p.latitude
                  let lng = p.longitude
                  // Google predictions carry no coords — resolve via place-details.
                  if (lat == null || lng == null) {
                    const details = await fetchPlaceDetails(p.placeId)
                    lat = details?.latitude
                    lng = details?.longitude
                  }
                  if (lat != null && lng != null) {
                    commit({
                      label: p.mainText ?? p.description,
                      addressLine: p.description,
                      latitude: lat,
                      longitude: lng,
                    })
                  } else {
                    toast.error('Could not resolve that location, try another')
                  }
                }}
                className="tap flex items-start gap-3 border-b border-border-faint px-1 py-3 text-left"
              >
                <MapPin size={18} className="mt-0.5 shrink-0 text-text-3" />
                <span className="min-w-0">
                  <span className="block text-body font-medium text-text">{p.mainText ?? p.description}</span>
                  {p.secondaryText && <span className="block text-caption text-text-2">{p.secondaryText}</span>}
                </span>
              </button>
            ))}
            {debounced.length >= 3 && !isFetching && !predictions?.length && (
              <p className="px-1 py-6 text-center text-subhead text-text-3">No matches found</p>
            )}
            {debounced.length < 3 && (
              <p className="px-1 py-6 text-center text-subhead text-text-3">
                Type at least 3 characters to search
              </p>
            )}
          </div>
        </div>
      )}

      {step === 'confirm' && pending && (
        <div className="flex flex-col gap-4 pb-2">
          <div className="flex items-center gap-2">
            <button onClick={() => setStep('list')} aria-label="Back" className="tap text-text-2">
              <ArrowLeft size={22} />
            </button>
            <span className="text-title font-bold text-text">Confirm location</span>
          </div>
          <div className="flex items-start gap-3 rounded-lg border border-border bg-surface-2 p-4">
            <MapPin size={22} className="mt-0.5 shrink-0 text-primary" />
            <div className="min-w-0">
              {geocoding ? (
                <span className="flex items-center gap-2 text-subhead text-text-2">
                  <Spinner size={16} /> Locating…
                </span>
              ) : (
                <>
                  <p className="text-body font-semibold text-text">
                    {geocoded?.area ?? geocoded?.addressLine ?? 'Current location'}
                  </p>
                  <p className="text-subhead text-text-2">{geocoded?.addressLine}</p>
                </>
              )}
            </div>
          </div>
          <Button
            full
            size="lg"
            disabled={geocoding}
            icon={<Plus size={18} />}
            onClick={() =>
              commit({
                label: geocoded?.area ?? 'Current location',
                addressLine: geocoded?.addressLine ?? 'Pinned location',
                latitude: geocoded?.latitude ?? pending.lat,
                longitude: geocoded?.longitude ?? pending.lng,
              })
            }
          >
            Confirm location
          </Button>
        </div>
      )}
    </BottomSheet>
  )
}
