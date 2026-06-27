import { useEffect, useRef, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft,
  Search,
  Navigation,
  MapPin,
  Home as HomeIcon,
  Briefcase,
  Tag,
  Trash2,
  Pencil,
  ChevronRight,
  User,
  Phone,
  Plus,
} from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { Field } from '@/components/ui/Field'
import { fetchPlaceDetails, useAutocomplete, useReverseGeocode } from '@/api/hooks/useLocation'
import { useGeolocation } from '@/hooks/useGeolocation'
import { useDebounce } from '@/hooks/useDebounce'
import { useAddresses, useCreateAddress, useUpdateAddress, useDeleteAddress } from '@/api/hooks/useUser'
import { useAddressStore, type SelectedAddress } from '@/stores/addressStore'
import { useAuthStore } from '@/stores/authStore'
import { toast } from '@/stores/toastStore'
import { toNum } from '@/lib/format'
import { cn } from '@/lib/cn'
import type { AuthUser, UserAddress } from '@/api/types'

type Step = 'list' | 'search' | 'confirm' | 'details'
type AddressType = 'Home' | 'Work' | 'Other'

interface PendingLocation {
  lat: number
  lng: number
  existing?: UserAddress
}

// ─── Main component ───────────────────────────────────────────────────────────

/**
 * Full-screen keyboard-safe address overlay.
 *
 * `requireDetails=false` (default — home/cart screen):
 *   GPS / search → quick confirm → commit as ad-hoc pin. No form shown.
 *
 * `requireDetails=true` (address book):
 *   GPS / search → full Blinkit-style details form → save + commit.
 *
 * Full details are collected at checkout time if an address is incomplete.
 */
export function AddressOverlay({
  open,
  onOpenChange,
  dismissible = true,
  requireDetails = false,
  onCommit,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  dismissible?: boolean
  /**
   * When true, after GPS/search the user fills in flat/area/receiver details
   * and the address is persisted to the backend.
   * When false (default), GPS/search shows a quick confirm step — the pin is
   * committed as an ad-hoc location without persisting to the address book.
   */
  requireDetails?: boolean
  onCommit?: (addr: SelectedAddress) => void
}) {
  const qc = useQueryClient()
  const setAddress = useAddressStore((s) => s.setAddress)
  const user = useAuthStore((s) => s.user)
  const { data: saved } = useAddresses()
  const geo = useGeolocation()
  const deleteAddress = useDeleteAddress()

  const [step, setStep] = useState<Step>('list')
  const [pending, setPending] = useState<PendingLocation | null>(null)

  // Search state
  const [query, setQuery] = useState('')
  const debounced = useDebounce(query, 300)
  const { data: predictions = [], isFetching: fetchingPredictions } = useAutocomplete(debounced)
  const searchInputRef = useRef<HTMLInputElement>(null)

  function reset() {
    setStep('list')
    setQuery('')
    setPending(null)
  }

  function close() {
    if (dismissible) {
      reset()
      onOpenChange(false)
    }
  }

  function commit(addr: SelectedAddress) {
    setAddress(addr)
    onCommit?.(addr)
    qc.invalidateQueries({ queryKey: ['sellers'] })
    qc.invalidateQueries({ queryKey: ['seller'] })
    reset()
    onOpenChange(false)
  }

  // After GPS/search, route to confirm (quick) or details (full)
  function gotLocation(loc: PendingLocation) {
    setPending(loc)
    setStep(requireDetails || loc.existing ? 'details' : 'confirm')
  }

  // ── Step: list actions ──────────────────────────────────────────────────────

  async function useCurrentLocation() {
    try {
      const { latitude, longitude } = await geo.getCurrentPosition()
      gotLocation({ lat: latitude, lng: longitude })
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

  function editSaved(a: UserAddress) {
    const lat = toNum(a.latitude, NaN)
    const lng = toNum(a.longitude, NaN)
    if (Number.isNaN(lat) || Number.isNaN(lng)) return
    // Editing always opens full details form
    setPending({ lat, lng, existing: a })
    setStep('details')
  }

  async function deleteSaved(id: string) {
    try {
      await deleteAddress.mutateAsync(id)
      toast.success('Address deleted')
    } catch {
      toast.error('Could not delete address')
    }
  }

  // ── Step: search ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (step === 'search') {
      setTimeout(() => searchInputRef.current?.focus(), 80)
    }
  }, [step])

  async function pickPrediction(p: (typeof predictions)[number]) {
    let lat = p.latitude
    let lng = p.longitude
    if (lat == null || lng == null) {
      const details = await fetchPlaceDetails(p.placeId)
      lat = details?.latitude
      lng = details?.longitude
    }
    if (lat != null && lng != null) {
      setQuery('')
      gotLocation({ lat, lng })
    } else {
      toast.error('Could not resolve that location, try another')
    }
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(o) => {
        if (!o) close()
      }}
    >
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Title className="sr-only">Set delivery address</Dialog.Title>
            <Dialog.Content
              asChild
              onEscapeKeyDown={close}
              onInteractOutside={(e) => {
                if (!dismissible) e.preventDefault()
              }}
            >
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 24 }}
                transition={{ type: 'spring', stiffness: 340, damping: 32 }}
                className="fixed bottom-0 left-1/2 top-0 z-100 flex w-full max-w-107.5 -translate-x-1/2 flex-col bg-bg"
              >
                {step === 'list' && (
                  <ListStep
                    saved={saved ?? []}
                    geoLoading={geo.loading}
                    onGps={useCurrentLocation}
                    onSearch={() => setStep('search')}
                    onPickSaved={pickSaved}
                    onEditSaved={editSaved}
                    onDeleteSaved={deleteSaved}
                    onClose={close}
                    dismissible={dismissible}
                  />
                )}

                {step === 'search' && (
                  <SearchStep
                    inputRef={searchInputRef}
                    query={query}
                    setQuery={setQuery}
                    predictions={predictions}
                    fetching={fetchingPredictions}
                    debounced={debounced}
                    onPick={pickPrediction}
                    onBack={() => setStep('list')}
                  />
                )}

                {step === 'confirm' && pending && (
                  <ConfirmStep
                    pending={pending}
                    onBack={() => setStep('list')}
                    onCommit={commit}
                  />
                )}

                {step === 'details' && pending && (
                  <DetailsStep
                    pending={pending}
                    user={user}
                    onBack={() => setStep('list')}
                    onCommit={commit}
                  />
                )}
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  )
}

// ─── Step: List ───────────────────────────────────────────────────────────────

function ListStep({
  saved,
  geoLoading,
  onGps,
  onSearch,
  onPickSaved,
  onEditSaved,
  onDeleteSaved,
  onClose,
  dismissible,
}: {
  saved: UserAddress[]
  geoLoading: boolean
  onGps: () => void
  onSearch: () => void
  onPickSaved: (a: UserAddress) => void
  onEditSaved: (a: UserAddress) => void
  onDeleteSaved: (id: string) => void
  onClose: () => void
  dismissible: boolean
}) {
  function labelIcon(label: string) {
    const l = label.toLowerCase()
    if (l.includes('home')) return HomeIcon
    if (l.includes('work') || l.includes('office')) return Briefcase
    return MapPin
  }

  return (
    <div className="flex h-full flex-col">
      <div
        className="flex shrink-0 items-center gap-2 border-b border-border-faint px-4 pb-4"
        style={{ paddingTop: 'max(16px, env(safe-area-inset-top))' }}
      >
        {dismissible && (
          <button
            type="button"
            onClick={onClose}
            className="tap grid h-9 w-9 place-items-center rounded-full text-text-2"
          >
            <ArrowLeft size={20} />
          </button>
        )}
        <span className="flex-1 text-title font-bold text-text">Delivery location</span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {/* GPS */}
        <button
          type="button"
          onClick={onGps}
          disabled={geoLoading}
          className="tap flex w-full items-center gap-3 rounded-xl border-[1.5px] border-primary-soft-border bg-primary-soft px-4 py-3.5 text-left disabled:opacity-60"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-on-primary">
            {geoLoading ? <Spinner size={20} /> : <Navigation size={20} />}
          </span>
          <span className="flex-1">
            <span className="block text-body font-semibold text-text">Use current location</span>
            <span className="block text-caption text-text-2">GPS — accurate to ~10 m</span>
          </span>
          <ChevronRight size={18} className="text-text-3" />
        </button>

        {/* Search */}
        <button
          type="button"
          onClick={onSearch}
          className="mt-3 flex w-full items-center gap-2.5 rounded-xl border-[1.5px] border-border bg-surface px-4 py-3.5 text-left tap"
        >
          <Search size={18} className="shrink-0 text-text-3" />
          <span className="text-body text-text-3">Search for area, street name…</span>
        </button>

        {/* Saved addresses */}
        {saved.length > 0 && (
          <div className="mt-6">
            <p className="mb-2 text-micro font-bold uppercase tracking-[0.06em] text-text-3">
              Saved addresses
            </p>
            <div className="space-y-1">
              {saved.map((a) => {
                const Icon = labelIcon(a.label)
                return (
                  <div key={a.id} className="flex items-start rounded-xl py-1 hover:bg-surface-2">
                    <button
                      type="button"
                      onClick={() => onPickSaved(a)}
                      className="tap flex min-w-0 flex-1 items-start gap-3 px-2 py-2 text-left"
                    >
                      <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-2 text-primary">
                        <Icon size={18} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-body font-semibold text-text">{a.label}</span>
                        <span className="block truncate text-subhead text-text-2">
                          {a.addressLine}
                        </span>
                        {a.receiverName && (
                          <span className="block text-caption text-text-3">{a.receiverName}</span>
                        )}
                      </span>
                    </button>
                    <div className="flex shrink-0 items-center gap-0.5 self-center pr-2">
                      <button
                        type="button"
                        onClick={() => onEditSaved(a)}
                        className="tap grid h-8 w-8 place-items-center rounded-full text-text-3 hover:bg-surface-3"
                        aria-label="Edit address"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteSaved(a.id)}
                        className="tap grid h-8 w-8 place-items-center rounded-full text-danger hover:bg-danger-soft"
                        aria-label="Delete address"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {saved.length === 0 && (
          <div className="mt-8 flex flex-col items-center gap-2 text-center">
            <MapPin size={28} className="text-text-3" />
            <p className="text-subhead text-text-2">No saved addresses yet</p>
            <p className="text-caption text-text-3">
              Use GPS or search to add your first address.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Step: Search ─────────────────────────────────────────────────────────────

function SearchStep({
  inputRef,
  query,
  setQuery,
  predictions,
  fetching,
  debounced,
  onPick,
  onBack,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>
  query: string
  setQuery: (q: string) => void
  predictions: Array<{
    placeId: string
    mainText?: string
    secondaryText?: string
    description: string
    latitude?: number
    longitude?: number
  }>
  fetching: boolean
  debounced: string
  onPick: (p: {
    placeId: string
    mainText?: string
    description: string
    latitude?: number
    longitude?: number
  }) => void
  onBack: () => void
}) {
  return (
    <div className="flex h-full flex-col">
      {/* Input stays pinned at top — keyboard never covers it */}
      <div
        className="flex shrink-0 items-center gap-2 border-b border-border-faint px-3 pb-3"
        style={{ paddingTop: 'max(14px, env(safe-area-inset-top))' }}
      >
        <button
          type="button"
          onClick={onBack}
          className="tap grid h-9 w-9 shrink-0 place-items-center rounded-full text-text-2"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex flex-1 items-center gap-2 rounded-full border border-primary bg-surface px-3.5 py-2.5 shadow-sm">
          <Search size={15} className="shrink-0 text-text-3" />
          <input
            ref={inputRef}
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search area, street, landmark…"
            className="min-w-0 flex-1 bg-transparent text-body text-text outline-none placeholder:text-text-3"
          />
          {fetching && <Spinner size={14} />}
          {query && !fetching && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="tap grid h-5 w-5 place-items-center rounded-full bg-surface-3 text-caption text-text-3"
            >
              ×
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {predictions.map((p) => (
          <button
            key={p.placeId}
            type="button"
            onClick={() => onPick(p)}
            className="tap flex w-full items-start gap-3 border-b border-border-faint px-4 py-4 text-left"
          >
            <MapPin size={17} className="mt-0.5 shrink-0 text-text-3" />
            <span className="min-w-0">
              <span className="block text-body font-medium text-text">
                {p.mainText ?? p.description}
              </span>
              {p.secondaryText && (
                <span className="block text-caption text-text-2">{p.secondaryText}</span>
              )}
            </span>
          </button>
        ))}
        {debounced.length >= 3 && !fetching && predictions.length === 0 && (
          <p className="px-4 py-10 text-center text-subhead text-text-3">No matches found</p>
        )}
        {debounced.length < 3 && (
          <p className="px-4 py-10 text-center text-subhead text-text-3">
            Type at least 3 characters to search
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Step: Confirm (quick — no form) ─────────────────────────────────────────

function ConfirmStep({
  pending,
  onBack,
  onCommit,
}: {
  pending: PendingLocation
  onBack: () => void
  onCommit: (addr: SelectedAddress) => void
}) {
  const { data: geocoded, isLoading } = useReverseGeocode(pending.lat, pending.lng)

  const area = geocoded?.area ?? geocoded?.addressLine ?? 'Selected location'
  const fullLine = geocoded?.addressLine ?? `${pending.lat.toFixed(5)}, ${pending.lng.toFixed(5)}`

  function confirm() {
    onCommit({
      label: area,
      addressLine: fullLine,
      latitude: pending.lat,
      longitude: pending.lng,
    })
  }

  return (
    <div className="flex h-full flex-col">
      <div
        className="flex shrink-0 items-center gap-2 border-b border-border-faint px-4 pb-4"
        style={{ paddingTop: 'max(16px, env(safe-area-inset-top))' }}
      >
        <button
          type="button"
          onClick={onBack}
          className="tap grid h-9 w-9 place-items-center rounded-full text-text-2"
        >
          <ArrowLeft size={20} />
        </button>
        <span className="flex-1 text-title font-bold text-text">Confirm location</span>
      </div>

      <div className="flex flex-1 flex-col px-4 pb-10 pt-6">
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-primary-soft text-primary">
            <MapPin size={32} />
          </span>

          {isLoading ? (
            <div className="flex flex-col items-center gap-2">
              <Spinner />
              <p className="text-subhead text-text-2">Finding your location…</p>
            </div>
          ) : (
            <>
              <div>
                <p className="text-title font-bold text-text">{area}</p>
                <p className="mt-1 text-subhead text-text-2">{fullLine}</p>
              </div>
            </>
          )}
        </div>

        <Button
          full
          size="lg"
          disabled={isLoading}
          onClick={confirm}
        >
          Deliver here
        </Button>
      </div>
    </div>
  )
}

// ─── Step: Details (full form — address book) ─────────────────────────────────

const ADDRESS_TYPES: { type: AddressType; Icon: React.ElementType }[] = [
  { type: 'Home', Icon: HomeIcon },
  { type: 'Work', Icon: Briefcase },
  { type: 'Other', Icon: Tag },
]

function parseAddressType(label: string): AddressType {
  if (label === 'Home' || label === 'Work') return label
  return 'Other'
}

function DetailsStep({
  pending,
  user,
  onBack,
  onCommit,
}: {
  pending: PendingLocation
  user: AuthUser | null
  onBack: () => void
  onCommit: (addr: SelectedAddress) => void
}) {
  const existing = pending.existing
  const createAddress = useCreateAddress()
  const updateAddress = useUpdateAddress()

  const { data: geocoded, isLoading: geocoding } = useReverseGeocode(pending.lat, pending.lng)
  const initializedRef = useRef(false)

  const [flat, setFlat] = useState('')
  const [areaField, setAreaField] = useState(() =>
    existing ? existing.addressLine : '',
  )
  const [landmark, setLandmark] = useState('')
  const [addressType, setAddressType] = useState<AddressType>(() =>
    existing ? parseAddressType(existing.label) : 'Home',
  )
  const [customLabel, setCustomLabel] = useState(() => {
    if (!existing) return ''
    return parseAddressType(existing.label) === 'Other' ? existing.label : ''
  })
  const [forSomeoneElse, setForSomeoneElse] = useState(() => {
    if (!existing?.receiverName) return false
    return existing.receiverName !== (user?.name ?? '')
  })
  const [receiverName, setReceiverName] = useState(() =>
    existing?.receiverName ?? user?.name ?? '',
  )
  const [receiverPhone, setReceiverPhone] = useState(() =>
    existing?.receiverPhone ?? user?.phone ?? '',
  )

  // Pre-fill area from geocode — only once, only for new addresses
  useEffect(() => {
    if (existing || initializedRef.current) return
    const area = geocoded?.area ?? geocoded?.addressLine
    if (area) {
      setAreaField(area)
      initializedRef.current = true
    }
  }, [geocoded, existing])

  const isBusy = createAddress.isPending || updateAddress.isPending
  const label =
    addressType === 'Other' ? customLabel.trim() || 'Other' : addressType
  const composedLine = [flat.trim(), areaField.trim(), landmark.trim()]
    .filter(Boolean)
    .join(', ')
  const canSave =
    areaField.trim().length > 0 &&
    receiverName.trim().length > 0 &&
    (addressType !== 'Other' || customLabel.trim().length > 0)

  async function handleSave() {
    if (!canSave) return
    try {
      const payload = {
        label,
        addressLine: composedLine || areaField.trim(),
        receiverName: receiverName.trim() || undefined,
        receiverPhone: receiverPhone.trim() || undefined,
        latitude: pending.lat,
        longitude: pending.lng,
      }

      let savedId = existing?.id
      if (existing?.id) {
        await updateAddress.mutateAsync({ id: existing.id, ...payload })
      } else {
        const saved = await createAddress.mutateAsync(payload)
        savedId = saved.id
      }

      onCommit({
        id: savedId,
        label: payload.label,
        addressLine: payload.addressLine,
        receiverName: payload.receiverName ?? null,
        receiverPhone: payload.receiverPhone ?? null,
        latitude: pending.lat,
        longitude: pending.lng,
      })
    } catch {
      toast.error('Could not save address. Please try again.')
    }
  }

  const areaDisplay = geocoded?.area ?? geocoded?.addressLine ?? 'Selected location'

  return (
    <div className="flex h-full flex-col">
      <div
        className="flex shrink-0 items-center gap-2 border-b border-border-faint px-4 pb-4"
        style={{ paddingTop: 'max(16px, env(safe-area-inset-top))' }}
      >
        <button
          type="button"
          onClick={onBack}
          className="tap grid h-9 w-9 place-items-center rounded-full text-text-2"
        >
          <ArrowLeft size={20} />
        </button>
        <span className="flex-1 text-title font-bold text-text">
          {existing ? 'Edit address' : 'Add address details'}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-10 pt-4">
        {/* Location pin pill */}
        <div className="mb-5 flex items-center gap-2.5 rounded-xl bg-primary-soft px-3.5 py-3">
          <MapPin size={18} className="shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            {geocoding ? (
              <span className="flex items-center gap-2 text-subhead text-text-2">
                <Spinner size={14} /> Locating…
              </span>
            ) : (
              <span className="block truncate text-subhead font-semibold text-text">
                {areaDisplay}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onBack}
            className="tap shrink-0 text-caption font-semibold text-primary"
          >
            Change
          </button>
        </div>

        {/* Fields */}
        <div className="space-y-3.5">
          <Field
            label="House / Flat / Block no."
            placeholder="e.g. Flat 4B, Block C"
            value={flat}
            onChange={(e) => setFlat(e.target.value)}
            autoComplete="address-line1"
            autoFocus
          />
          <Field
            label="Apartment / Road / Area"
            placeholder="Street or area name"
            value={areaField}
            onChange={(e) => setAreaField(e.target.value)}
            autoComplete="address-line2"
          />
          <Field
            label="Landmark (optional)"
            placeholder="e.g. Near City Mall"
            value={landmark}
            onChange={(e) => setLandmark(e.target.value)}
          />
        </div>

        {/* Save as */}
        <div className="mt-6">
          <p className="mb-2.5 text-subhead font-semibold text-text">Save as</p>
          <div className="flex gap-2.5">
            {ADDRESS_TYPES.map(({ type, Icon }) => (
              <button
                key={type}
                type="button"
                onClick={() => setAddressType(type)}
                className={cn(
                  'flex flex-1 items-center justify-center gap-1.5 rounded-xl border-[1.5px] py-2.5 text-subhead font-semibold transition-colors tap',
                  addressType === type
                    ? 'border-primary bg-primary-soft text-primary'
                    : 'border-border bg-surface text-text-2',
                )}
              >
                <Icon size={15} />
                {type}
              </button>
            ))}
          </div>
          {addressType === 'Other' && (
            <div className="mt-3">
              <Field
                placeholder="Custom label (e.g. Parents' home)"
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
              />
            </div>
          )}
        </div>

        {/* Delivering to */}
        <div className="mt-6">
          <p className="mb-2.5 text-subhead font-semibold text-text">Delivering to</p>
          <div className="flex gap-2.5">
            {(['Me', 'Someone else'] as const).map((opt) => {
              const active = opt === 'Me' ? !forSomeoneElse : forSomeoneElse
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    const toSomeone = opt === 'Someone else'
                    setForSomeoneElse(toSomeone)
                    if (!toSomeone) {
                      setReceiverName(user?.name ?? '')
                      setReceiverPhone(user?.phone ?? '')
                    } else {
                      setReceiverName('')
                      setReceiverPhone('')
                    }
                  }}
                  className={cn(
                    'flex flex-1 items-center justify-center gap-1.5 rounded-xl border-[1.5px] py-2.5 text-subhead font-semibold transition-colors tap',
                    active
                      ? 'border-primary bg-primary-soft text-primary'
                      : 'border-border bg-surface text-text-2',
                  )}
                >
                  {opt === 'Me' ? <User size={14} /> : <Plus size={14} />}
                  {opt}
                </button>
              )
            })}
          </div>
          <div className="mt-3.5 space-y-3">
            <Field
              label={forSomeoneElse ? "Receiver's name" : 'Your name'}
              leading={<User size={16} />}
              placeholder="Full name"
              value={receiverName}
              onChange={(e) => setReceiverName(e.target.value)}
              autoComplete="name"
            />
            <Field
              label={forSomeoneElse ? "Receiver's phone" : 'Your phone (optional)'}
              leading={<Phone size={16} />}
              placeholder="10-digit mobile number"
              value={receiverPhone}
              onChange={(e) => setReceiverPhone(e.target.value)}
              inputMode="tel"
              autoComplete="tel"
            />
          </div>
        </div>

        <Button
          full
          size="lg"
          className="mt-8"
          disabled={!canSave || geocoding}
          loading={isBusy}
          onClick={handleSave}
        >
          {existing ? 'Update address' : 'Save address'}
        </Button>
      </div>
    </div>
  )
}
