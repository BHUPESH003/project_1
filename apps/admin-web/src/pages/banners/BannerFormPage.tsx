import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Image as ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Switch } from '@/components/ui/Switch'
import { Spinner } from '@/components/ui/Spinner'
import { ImageUpload } from '@/components/shared/ImageUpload'
import { useBanner, useCreateBanner, useUpdateBanner } from '@/api/hooks/useBanners'
import { toast } from '@/stores/toastStore'
import { getErrorMessage } from '@/api/client'
import { assetUrl } from '@/lib/format'
import type { Banner, BannerInput } from '@/types/api'

const EMPTY: BannerInput = {
  title: '',
  imagePath: '',
  badge: '',
  subtitle: '',
  ctaText: '',
  ctaLink: '',
  displayOrder: 0,
  isActive: true,
  startAt: null,
  endAt: null,
}

function toDateInput(iso: string | null | undefined) {
  return iso ? iso.slice(0, 10) : ''
}

/** Loader: fetches the banner in edit mode, then mounts the form with initial data. */
export function BannerFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id
  const existing = useBanner(id)

  if (isEdit && existing.isLoading) {
    return (
      <div className="grid place-items-center py-20 text-text-3">
        <Spinner size={28} />
      </div>
    )
  }

  const initial: BannerInput = existing.data ? fromBanner(existing.data) : EMPTY
  return <BannerForm key={id ?? 'new'} id={id} isEdit={isEdit} initial={initial} />
}

function fromBanner(b: Banner): BannerInput {
  return {
    title: b.title,
    imagePath: b.imagePath,
    badge: b.badge ?? '',
    subtitle: b.subtitle ?? '',
    ctaText: b.ctaText ?? '',
    ctaLink: b.ctaLink ?? '',
    displayOrder: b.displayOrder,
    isActive: b.isActive,
    startAt: b.startAt,
    endAt: b.endAt,
  }
}

function BannerForm({
  id,
  isEdit,
  initial,
}: {
  id?: string
  isEdit: boolean
  initial: BannerInput
}) {
  const navigate = useNavigate()
  const create = useCreateBanner()
  const update = useUpdateBanner()
  const [form, setForm] = useState<BannerInput>(initial)

  const set = (patch: Partial<BannerInput>) => setForm((f) => ({ ...f, ...patch }))
  const valid = form.title.trim() && form.imagePath.trim()

  async function save() {
    if (!valid) return
    const payload: BannerInput = {
      ...form,
      badge: form.badge || null,
      subtitle: form.subtitle || null,
      ctaText: form.ctaText || null,
      ctaLink: form.ctaLink || null,
      startAt: form.startAt || null,
      endAt: form.endAt || null,
    }
    try {
      if (isEdit) await update.mutateAsync({ id: id!, input: payload })
      else await create.mutateAsync(payload)
      toast.success(isEdit ? 'Banner updated' : 'Banner created')
      navigate('/banners')
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  const previewImg = assetUrl(form.imagePath)

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/banners')}
          aria-label="Back"
          className="tap grid h-9 w-9 place-items-center rounded-md border border-border text-text-2 hover:bg-surface-2"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-title-lg font-bold text-text">{isEdit ? 'Edit banner' : 'New banner'}</h1>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Form */}
        <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5">
          <ImageUpload label="Banner image" value={form.imagePath} onChange={(p) => set({ imagePath: p })} />
          <Field label="Title" value={form.title} onChange={(e) => set({ title: e.target.value })} placeholder="Big summer sale" />
          <Field label="Subtitle" value={form.subtitle ?? ''} onChange={(e) => set({ subtitle: e.target.value })} placeholder="Up to 50% off" />
          <Field label="Badge text" value={form.badge ?? ''} onChange={(e) => set({ badge: e.target.value })} placeholder="New" />
          <div className="grid grid-cols-2 gap-4">
            <Field label="CTA text" value={form.ctaText ?? ''} onChange={(e) => set({ ctaText: e.target.value })} placeholder="Shop now" />
            <Field label="CTA link" value={form.ctaLink ?? ''} onChange={(e) => set({ ctaLink: e.target.value })} placeholder="/category/printing" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field
              label="Display order"
              type="number"
              value={String(form.displayOrder ?? 0)}
              onChange={(e) => set({ displayOrder: Number(e.target.value) })}
            />
            <div className="flex flex-col gap-[7px]">
              <span className="text-subhead font-medium text-text-2">Active</span>
              <div className="flex h-[50px] items-center">
                <Switch checked={!!form.isActive} onCheckedChange={(v) => set({ isActive: v })} />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field
              label="Start date"
              type="date"
              value={toDateInput(form.startAt)}
              onChange={(e) => set({ startAt: e.target.value || null })}
            />
            <Field
              label="End date"
              type="date"
              value={toDateInput(form.endAt)}
              onChange={(e) => set({ endAt: e.target.value || null })}
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={() => navigate('/banners')}>
              Cancel
            </Button>
            <Button loading={create.isPending || update.isPending} disabled={!valid} onClick={save}>
              {isEdit ? 'Save changes' : 'Create banner'}
            </Button>
          </div>
        </div>

        {/* Live preview */}
        <div>
          <p className="mb-2 text-subhead font-medium text-text-2">Preview</p>
          <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-md">
            <div className="relative aspect-video bg-surface-2">
              {previewImg ? (
                <img src={previewImg} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full place-items-center text-text-3">
                  <ImageIcon size={32} />
                </div>
              )}
              <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/65 to-transparent p-5">
                {form.badge && (
                  <span className="mb-2 w-fit rounded-full bg-primary px-2.5 py-1 text-caption font-bold text-on-primary">
                    {form.badge}
                  </span>
                )}
                <h3 className="text-title-lg font-extrabold text-white">{form.title || 'Banner title'}</h3>
                {form.subtitle && <p className="text-subhead text-white/90">{form.subtitle}</p>}
                {form.ctaText && (
                  <span className="mt-3 w-fit rounded-lg bg-white px-4 py-2 text-subhead font-semibold text-slate-900">
                    {form.ctaText}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
