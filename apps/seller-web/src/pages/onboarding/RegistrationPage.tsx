/* eslint-disable react-hooks/set-state-in-effect -- prefill local form state from fetched server data */
import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Check,
  ImagePlus,
  Loader2,
  MapPin,
  Search,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { cn } from '@/lib/cn'
import { useDebounce } from '@/hooks/useDebounce'
import { useCategories, useAutocomplete, fetchPlaceDetails } from '@/api/hooks/useCatalog'
import { useRegisterSeller, useUpdateSeller, useSellerProfile } from '@/api/hooks/useSeller'
import { uploadImage, ACCEPTED_IMAGE_TYPES, MAX_IMAGE_SIZE } from '@/api/hooks/useFiles'
import { getErrorMessage } from '@/api/client'
import { toast } from '@/stores/toastStore'
import type { AutocompleteResult } from '@/types/api'

const PREP_OPTIONS = [5, 10, 15, 30, 60]

export function RegistrationPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const isEdit = !!(location.state as { edit?: boolean } | null)?.edit
  const { data: existing } = useSellerProfile({ enabled: isEdit })

  const register = useRegisterSeller()
  const update = useUpdateSeller()
  const { data: categories } = useCategories()

  const [step, setStep] = useState(1)
  const [shopName, setShopName] = useState('')
  const [description, setDescription] = useState('')
  const [imagePath, setImagePath] = useState<string | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const [address, setAddress] = useState('')
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounce(query, 300)
  const { data: predictions, isFetching } = useAutocomplete(debouncedQuery)

  const [categoryIds, setCategoryIds] = useState<string[]>([])
  const [pricePerPage, setPricePerPage] = useState('')
  const [prepTime, setPrepTime] = useState(15)

  // Prefill in edit mode.
  useEffect(() => {
    if (!isEdit || !existing) return
    setShopName(existing.shopName)
    setDescription(existing.description ?? '')
    setImagePath(existing.imagePath)
    setImagePreview(existing.imageUrl ?? null)
    setAddress(existing.address)
    setCoords({ lat: Number(existing.latitude), lng: Number(existing.longitude) })
    setCategoryIds(existing.categories?.map((c) => c.id) ?? [])
    setPricePerPage(existing.pricePerPage != null ? String(existing.pricePerPage) : '')
    setPrepTime(existing.prepTimeMinutes ?? 15)
  }, [isEdit, existing])

  const showsPricing = useMemo(
    () => categoryIds.some((id) => id.toLowerCase().includes('print')),
    [categoryIds],
  )

  async function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_IMAGE_SIZE) {
      toast.error('Image must be under 10MB')
      return
    }
    setImagePreview(URL.createObjectURL(file))
    setUploading(true)
    try {
      const { path } = await uploadImage(file)
      setImagePath(path)
    } catch (err) {
      toast.error(getErrorMessage(err, 'Upload failed'))
      setImagePreview(null)
    } finally {
      setUploading(false)
    }
  }

  async function selectPrediction(prediction: AutocompleteResult) {
    setAddress(prediction.description)
    setQuery('')
    // Dev/mock predictions already carry coordinates — use them directly.
    // Google predictions don't, so resolve them via the place-details lookup.
    if (prediction.latitude != null && prediction.longitude != null) {
      setCoords({ lat: prediction.latitude, lng: prediction.longitude })
      return
    }
    try {
      const details = await fetchPlaceDetails(prediction.placeId)
      if (details) setCoords({ lat: details.latitude, lng: details.longitude })
    } catch {
      /* keep address text even if geocode fails */
    }
  }

  function toggleCategory(id: string) {
    setCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    )
  }

  const step1Valid = shopName.trim().length >= 2
  const step2Valid = address.trim().length >= 5 && !!coords
  const step3Valid = categoryIds.length > 0

  async function submit() {
    if (!coords) return
    const payloadBase = {
      shopName: shopName.trim(),
      address: address.trim(),
      description: description.trim() || undefined,
      latitude: coords.lat,
      longitude: coords.lng,
      pricePerPage: pricePerPage ? Number(pricePerPage) : undefined,
      prepTimeMinutes: prepTime,
    }
    try {
      if (isEdit) {
        await update.mutateAsync({ ...payloadBase, imagePath: imagePath ?? undefined })
        toast.success('Profile updated')
        navigate(-1)
      } else {
        await register.mutateAsync({ ...payloadBase, categoryIds })
        if (imagePath) {
          try {
            await update.mutateAsync({ imagePath })
          } catch {
            /* non-fatal: profile created, image can be set later */
          }
        }
        navigate('/pending', { replace: true })
      }
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  const submitting = register.isPending || update.isPending

  return (
    <div className="flex min-h-dvh flex-col px-5 pb-8 pt-[max(20px,env(safe-area-inset-top))]">
      {/* Header + progress */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => (step > 1 ? setStep(step - 1) : navigate(-1))}
          aria-label="Back"
          className="tap -ml-2 grid h-10 w-10 place-items-center text-text-2"
        >
          <ArrowLeft size={22} />
        </button>
        <div className="flex flex-1 gap-1.5">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className={cn(
                'h-1.5 flex-1 rounded-full transition-colors',
                n <= step ? 'bg-primary' : 'bg-surface-3',
              )}
            />
          ))}
        </div>
        <span className="text-caption font-semibold text-text-3">{step}/3</span>
      </div>

      <motion.div
        key={step}
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="mt-6 flex flex-1 flex-col"
      >
        {step === 1 && (
          <>
            <h1 className="text-title-lg font-extrabold text-text">Shop basics</h1>
            <p className="mt-1 text-subhead text-text-2">Tell customers about your shop.</p>

            <label className="mt-6 flex flex-col items-center">
              <div className="relative grid h-28 w-28 place-items-center overflow-hidden rounded-2xl border-2 border-dashed border-border bg-surface-2">
                {imagePreview ? (
                  <img src={imagePreview} alt="Shop" className="h-full w-full object-cover" />
                ) : (
                  <ImagePlus size={28} className="text-text-3" />
                )}
                {uploading && (
                  <div className="absolute inset-0 grid place-items-center bg-black/40">
                    <Loader2 size={22} className="animate-spin text-white" />
                  </div>
                )}
                <input
                  type="file"
                  accept={ACCEPTED_IMAGE_TYPES}
                  onChange={handleImage}
                  className="absolute inset-0 cursor-pointer opacity-0"
                />
              </div>
              <span className="mt-2 text-caption font-medium text-primary">
                {imagePreview ? 'Change photo' : 'Add shop photo'}
              </span>
            </label>

            <div className="mt-5 flex flex-col gap-4">
              <Field
                label="Shop name"
                placeholder="e.g. Fast Print Hub"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                maxLength={100}
              />
              <Field
                label="Description (optional)"
                placeholder="Printing, binding & stationery"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={200}
              />
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="text-title-lg font-extrabold text-text">Shop location</h1>
            <p className="mt-1 text-subhead text-text-2">
              Where customers and delivery partners will find you.
            </p>

            <div className="mt-6">
              <Field
                label="Search address"
                placeholder="Search for your shop's address"
                leading={<Search size={18} />}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {isFetching && <p className="mt-2 text-caption text-text-3">Searching…</p>}
              {predictions && predictions.length > 0 && (
                <div className="mt-2 overflow-hidden rounded-md border border-border bg-surface">
                  {predictions.map((p) => (
                    <button
                      key={p.placeId}
                      onClick={() => selectPrediction(p)}
                      className="flex w-full items-start gap-2.5 border-b border-border-faint px-3.5 py-3 text-left last:border-0 hover:bg-surface-2"
                    >
                      <MapPin size={17} className="mt-0.5 shrink-0 text-text-3" />
                      <span className="text-subhead text-text">{p.description}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {address && (
              <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-primary-soft-border bg-primary-soft p-3.5">
                <MapPin size={18} className="mt-0.5 shrink-0 text-primary" />
                <div className="min-w-0">
                  <p className="text-subhead font-semibold text-text">Selected address</p>
                  <p className="text-subhead text-text-2">{address}</p>
                  {!coords && (
                    <p className="mt-1 text-caption text-warning">
                      Pick a suggestion above to set the exact location.
                    </p>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {step === 3 && (
          <>
            <h1 className="text-title-lg font-extrabold text-text">Categories & pricing</h1>
            <p className="mt-1 text-subhead text-text-2">What does your shop offer?</p>

            <div className="mt-5 flex flex-wrap gap-2">
              {categories?.map((c) => {
                const active = categoryIds.includes(c.id)
                return (
                  <button
                    key={c.id}
                    onClick={() => toggleCategory(c.id)}
                    className={cn(
                      'flex items-center gap-1.5 rounded-full border-[1.5px] px-4 py-2.5 text-subhead font-semibold transition-colors',
                      active
                        ? 'border-primary bg-primary-soft text-on-primary-soft'
                        : 'border-border bg-surface text-text-2',
                    )}
                  >
                    {active && <Check size={15} />}
                    {c.name}
                  </button>
                )
              })}
            </div>

            {showsPricing && (
              <div className="mt-6">
                <Field
                  label="Price per page (₹)"
                  type="number"
                  inputMode="decimal"
                  placeholder="e.g. 2"
                  value={pricePerPage}
                  onChange={(e) => setPricePerPage(e.target.value)}
                />
              </div>
            )}

            <div className="mt-6">
              <p className="mb-2 text-subhead font-medium text-text-2">Prep time estimate</p>
              <div className="flex flex-wrap gap-2">
                {PREP_OPTIONS.map((m) => (
                  <button
                    key={m}
                    onClick={() => setPrepTime(m)}
                    className={cn(
                      'rounded-full border-[1.5px] px-4 py-2.5 text-subhead font-semibold transition-colors',
                      prepTime === m
                        ? 'border-primary bg-primary-soft text-on-primary-soft'
                        : 'border-border bg-surface text-text-2',
                    )}
                  >
                    {m} min
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </motion.div>

      <div className="mt-6">
        {step < 3 ? (
          <Button
            full
            size="lg"
            disabled={(step === 1 && !step1Valid) || (step === 2 && !step2Valid)}
            onClick={() => setStep(step + 1)}
          >
            Continue
          </Button>
        ) : (
          <Button
            full
            size="lg"
            disabled={!step3Valid || uploading}
            loading={submitting}
            onClick={submit}
          >
            {isEdit ? 'Save changes' : 'Submit application'}
          </Button>
        )}
      </div>
    </div>
  )
}
