/* eslint-disable react-hooks/set-state-in-effect -- prefill local form state from fetched server data */
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ImagePlus, Loader2, Trash2 } from 'lucide-react'
import { StackHeader } from '@/components/layout/StackHeader'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Switch } from '@/components/ui/Switch'
import { BottomSheet } from '@/components/sheets/BottomSheet'
import {
  useProducts,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
} from '@/api/hooks/useProducts'
import { useSellerProfile } from '@/api/hooks/useSeller'
import { uploadImage, ACCEPTED_IMAGE_TYPES, MAX_IMAGE_SIZE } from '@/api/hooks/useFiles'
import { assetUrl } from '@/lib/format'
import { getErrorMessage } from '@/api/client'
import { toast } from '@/stores/toastStore'

const UNITS = ['per piece', 'per page', 'per kg', 'per set']

export function AddEditProductPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id

  const { data: products } = useProducts()
  const { data: seller } = useSellerProfile()
  const create = useCreateProduct()
  const update = useUpdateProduct()
  const remove = useDeleteProduct()

  const existing = useMemo(
    () => (isEdit ? products?.items.find((p) => p.id === id) : undefined),
    [isEdit, products, id],
  )

  const categoryOptions = useMemo(
    () => seller?.categories?.map((c) => c.name) ?? [],
    [seller],
  )

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [unit, setUnit] = useState('per piece')
  const [price, setPrice] = useState('')
  const [mrp, setMrp] = useState('')
  const [inStock, setInStock] = useState(true)
  const [bestSeller, setBestSeller] = useState(false)
  const [imagePath, setImagePath] = useState<string | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (!existing) return
    setName(existing.name)
    setDescription(existing.description ?? '')
    setCategory(existing.category)
    setUnit(existing.unit ?? 'per piece')
    setPrice(String(existing.price))
    setMrp(existing.mrp != null ? String(existing.mrp) : '')
    setInStock(existing.inStock)
    setBestSeller(existing.isBestSeller)
    setImagePath(existing.image)
    setImagePreview(existing.image ? (assetUrl(existing.image) ?? null) : null)
  }, [existing])

  // Default category to the seller's first when creating.
  useEffect(() => {
    if (!isEdit && !category && categoryOptions.length) setCategory(categoryOptions[0])
  }, [isEdit, category, categoryOptions])

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
    } finally {
      setUploading(false)
    }
  }

  const valid = name.trim().length >= 2 && price !== '' && Number(price) >= 0 && !!category

  async function save() {
    const input = {
      name: name.trim(),
      description: description.trim() || undefined,
      category,
      unit: unit || undefined,
      price: Number(price),
      mrp: mrp ? Number(mrp) : undefined,
      image: imagePath ?? undefined,
      inStock,
      isBestSeller: bestSeller,
    }
    try {
      if (isEdit && id) {
        await update.mutateAsync({ id, input })
        toast.success('Product updated')
      } else {
        await create.mutateAsync(input)
        toast.success('Product added')
      }
      navigate('/products')
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  async function doDelete() {
    if (!id) return
    try {
      await remove.mutateAsync(id)
      toast.success('Product removed')
      navigate('/products')
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  return (
    <div>
      <StackHeader title={isEdit ? 'Edit product' : 'Add product'} />

      <div className="px-4 pb-28">
        {/* Image */}
        <label className="mt-4 flex flex-col items-center">
          <div className="relative grid h-32 w-32 place-items-center overflow-hidden rounded-2xl border-2 border-dashed border-border bg-surface-2">
            {imagePreview ? (
              <img src={imagePreview} alt="Product" className="h-full w-full object-cover" />
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
            {imagePreview ? 'Change image' : 'Add image'}
          </span>
        </label>

        <div className="mt-5 flex flex-col gap-4">
          <Field
            label="Name"
            placeholder="e.g. A4 Color Print"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={200}
          />
          <Field
            label="Description (optional)"
            placeholder="Short description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={1000}
          />

          {/* Category */}
          <label className="flex flex-col gap-[7px]">
            <span className="text-subhead font-medium text-text-2">Category</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="min-h-[50px] rounded-md border-[1.5px] border-border bg-surface px-3.5 text-body text-text outline-none focus:border-primary"
            >
              {categoryOptions.length === 0 && <option value="">No categories</option>}
              {categoryOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          {/* Unit */}
          <label className="flex flex-col gap-[7px]">
            <span className="text-subhead font-medium text-text-2">Unit</span>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="min-h-[50px] rounded-md border-[1.5px] border-border bg-surface px-3.5 text-body text-text outline-none focus:border-primary"
            >
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </label>

          <div className="flex gap-3">
            <Field
              label="Price (₹)"
              type="number"
              inputMode="decimal"
              placeholder="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
            <Field
              label="MRP (₹, optional)"
              type="number"
              inputMode="decimal"
              placeholder="0"
              value={mrp}
              onChange={(e) => setMrp(e.target.value)}
            />
          </div>

          <ToggleRow label="In stock" checked={inStock} onChange={setInStock} />
          <ToggleRow label="Best seller" checked={bestSeller} onChange={setBestSeller} />

          {isEdit && (
            <Button
              variant="ghost"
              icon={<Trash2 size={17} />}
              className="!text-danger"
              onClick={() => setConfirmDelete(true)}
            >
              Remove product
            </Button>
          )}
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[430px] border-t border-border bg-surface/95 p-4 backdrop-blur-md">
        <Button
          full
          size="lg"
          disabled={!valid || uploading}
          loading={create.isPending || update.isPending}
          onClick={save}
        >
          {isEdit ? 'Save changes' : 'Add product'}
        </Button>
      </div>

      <BottomSheet open={confirmDelete} onOpenChange={setConfirmDelete} title="Remove product?">
        <p className="text-subhead text-text-2">
          This marks the product as out of stock and hides it from customers. Order
          history is preserved.
        </p>
        <div className="mt-5 flex flex-col gap-2.5">
          <Button full size="lg" variant="danger" loading={remove.isPending} onClick={doDelete}>
            Remove product
          </Button>
          <Button full size="md" variant="ghost" onClick={() => setConfirmDelete(false)}>
            Cancel
          </Button>
        </div>
      </BottomSheet>
    </div>
  )
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3">
      <span className="text-subhead font-medium text-text">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} tone="success" aria-label={label} />
    </div>
  )
}
