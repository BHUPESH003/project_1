/* eslint-disable react-hooks/set-state-in-effect -- prefill local form state from fetched server data */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronRight,
  ImagePlus,
  Loader2,
  MapPin,
  Search,
  User,
  Wallet,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Skeleton } from '@/components/ui/Skeleton'
import { useDebounce } from '@/hooks/useDebounce'
import { useSellerProfile, useUpdateSeller } from '@/api/hooks/useSeller'
import { useAutocomplete, fetchPlaceDetails } from '@/api/hooks/useCatalog'
import { uploadImage, ACCEPTED_IMAGE_TYPES, MAX_IMAGE_SIZE } from '@/api/hooks/useFiles'
import { getErrorMessage } from '@/api/client'
import { toast } from '@/stores/toastStore'

export function ShopSettingsPage() {
  const navigate = useNavigate()
  const { data: seller, isLoading } = useSellerProfile()
  const update = useUpdateSeller()

  const [shopName, setShopName] = useState('')
  const [description, setDescription] = useState('')
  const [address, setAddress] = useState('')
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [pricePerPage, setPricePerPage] = useState('')
  const [prepTime, setPrepTime] = useState('15')
  const [imagePath, setImagePath] = useState<string | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const [query, setQuery] = useState('')
  const debounced = useDebounce(query, 300)
  const { data: predictions, isFetching } = useAutocomplete(debounced)

  useEffect(() => {
    if (!seller) return
    setShopName(seller.shopName)
    setDescription(seller.description ?? '')
    setAddress(seller.address)
    setCoords({ lat: Number(seller.latitude), lng: Number(seller.longitude) })
    setPricePerPage(seller.pricePerPage != null ? String(seller.pricePerPage) : '')
    setPrepTime(String(seller.prepTimeMinutes ?? 15))
    setImagePath(seller.imagePath)
    setImagePreview(seller.imageUrl ?? null)
  }, [seller])

  async function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_IMAGE_SIZE) return toast.error('Image must be under 10MB')
    setImagePreview(URL.createObjectURL(file))
    setUploading(true)
    try {
      const { path } = await uploadImage(file)
      setImagePath(path)
    } catch (err) {
      toast.error(getErrorMessage(err, 'Upload failed'))
    } finally {
      setUploading(false)
    }
  }

  async function selectPrediction(placeId: string, desc: string) {
    setAddress(desc)
    setQuery('')
    try {
      const d = await fetchPlaceDetails(placeId)
      if (d) setCoords({ lat: d.latitude, lng: d.longitude })
    } catch {
      /* keep text */
    }
  }

  async function save() {
    if (!coords) return
    try {
      await update.mutateAsync({
        shopName: shopName.trim(),
        description: description.trim() || undefined,
        address: address.trim(),
        latitude: coords.lat,
        longitude: coords.lng,
        pricePerPage: pricePerPage ? Number(pricePerPage) : undefined,
        prepTimeMinutes: prepTime ? Number(prepTime) : undefined,
        imagePath: imagePath ?? undefined,
      })
      toast.success('Shop updated')
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3 p-4">
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
    )
  }

  return (
    <div>
      <header className="sticky top-0 z-30 border-b border-border bg-surface/95 px-4 py-3 backdrop-blur-md">
        <h1 className="text-title font-extrabold text-text">Shop</h1>
      </header>

      <div className="px-4 pb-28">
        {/* Quick links */}
        <div className="mt-4 overflow-hidden rounded-xl border border-border bg-surface">
          <LinkRow
            icon={<Wallet size={18} />}
            label="Earnings & payouts"
            onClick={() => navigate('/shop/earnings')}
          />
          <div className="h-px bg-border-faint" />
          <LinkRow
            icon={<User size={18} />}
            label="Account & preferences"
            onClick={() => navigate('/shop/profile')}
          />
        </div>

        <h2 className="mb-2 mt-6 text-subhead font-bold uppercase tracking-wide text-text-2">
          Shop details
        </h2>

        {/* Image */}
        <label className="flex flex-col items-center">
          <div className="relative grid h-28 w-28 place-items-center overflow-hidden rounded-2xl border-2 border-dashed border-border bg-surface-2">
            {imagePreview ? (
              <img src={imagePreview} alt="Shop" className="h-full w-full object-cover" />
            ) : (
              <ImagePlus size={26} className="text-text-3" />
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
          <span className="mt-2 text-caption font-medium text-primary">Change photo</span>
        </label>

        <div className="mt-5 flex flex-col gap-4">
          <Field label="Shop name" value={shopName} onChange={(e) => setShopName(e.target.value)} maxLength={100} />
          <Field
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
          />

          {/* Address */}
          <div>
            <p className="mb-1.5 text-subhead font-medium text-text-2">Address</p>
            <div className="rounded-md border border-border bg-surface p-3">
              <p className="flex items-start gap-2 text-subhead text-text">
                <MapPin size={16} className="mt-0.5 shrink-0 text-text-3" />
                {address}
              </p>
            </div>
            <div className="mt-2">
              <Field
                placeholder="Search to change address"
                leading={<Search size={17} />}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {isFetching && <p className="mt-1 text-caption text-text-3">Searching…</p>}
              {predictions && predictions.length > 0 && (
                <div className="mt-2 overflow-hidden rounded-md border border-border bg-surface">
                  {predictions.map((p) => (
                    <button
                      key={p.placeId}
                      onClick={() => selectPrediction(p.placeId, p.description)}
                      className="flex w-full items-start gap-2 border-b border-border-faint px-3 py-2.5 text-left text-subhead text-text last:border-0 hover:bg-surface-2"
                    >
                      <MapPin size={15} className="mt-0.5 shrink-0 text-text-3" />
                      {p.description}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <Field
              label="Price / page (₹)"
              type="number"
              inputMode="decimal"
              value={pricePerPage}
              onChange={(e) => setPricePerPage(e.target.value)}
            />
            <Field
              label="Prep time (min)"
              type="number"
              inputMode="numeric"
              value={prepTime}
              onChange={(e) => setPrepTime(e.target.value)}
            />
          </div>

          {seller && seller.categories.length > 0 && (
            <div>
              <p className="mb-1.5 text-subhead font-medium text-text-2">Categories</p>
              <div className="flex flex-wrap gap-2">
                {seller.categories.map((c) => (
                  <span
                    key={c.id}
                    className="rounded-full bg-primary-soft px-3 py-1.5 text-caption font-semibold text-on-primary-soft"
                  >
                    {c.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[430px] border-t border-border bg-surface/95 p-4 backdrop-blur-md">
        <Button full size="lg" loading={update.isPending} disabled={uploading} onClick={save}>
          Save changes
        </Button>
      </div>
    </div>
  )
}

function LinkRow({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 px-4 py-3.5 text-left">
      <span className="text-text-3">{icon}</span>
      <span className="flex-1 text-subhead font-semibold text-text">{label}</span>
      <ChevronRight size={18} className="text-text-3" />
    </button>
  )
}
