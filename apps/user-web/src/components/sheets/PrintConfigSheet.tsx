import { useMemo, useRef, useState } from 'react'
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  X,
  Plus,
  AlertCircle,
} from 'lucide-react'
import { BottomSheet } from './BottomSheet'
import { Button } from '@/components/ui/Button'
import { Stepper } from '@/components/ui/Stepper'
import { Spinner } from '@/components/ui/Spinner'
import { cn } from '@/lib/cn'
import { money, toNum } from '@/lib/format'
import { uploadFile, ACCEPTED_FILE_TYPES, MAX_FILE_SIZE } from '@/api/hooks/useFiles'
import { useAddPrintingItem, type PrintFileConfig } from '@/api/hooks/useCart'
import { toast } from '@/stores/toastStore'
import { getErrorMessage } from '@/api/client'
import type { Product, Seller } from '@/api/types'

type ColorMode = 'BW' | 'COLOR'
type PaperSize = 'A4' | 'A3' | 'LETTER'

interface UploadEntry {
  key: string
  name: string
  sizeBytes: number
  status: 'uploading' | 'ready' | 'error'
  progress: number
  fileId?: string
  pageCount: number
  config: {
    color: ColorMode
    paperSize: PaperSize
    copies: number
    allPages: boolean
    fromPage: number
    toPage: number
  }
}

/** Colour print is priced at a multiple of the seller's per-page (B&W) rate. */
const COLOR_MULTIPLIER = 4
let entrySeq = 0

function defaultConfig(pageCount: number): UploadEntry['config'] {
  return { color: 'BW', paperSize: 'A4', copies: 1, allPages: true, fromPage: 1, toPage: Math.max(pageCount, 1) }
}

function pagesOf(e: UploadEntry): number {
  if (e.config.allPages) return e.pageCount || 1
  return Math.max(1, e.config.toPage - e.config.fromPage + 1)
}

function priceOf(e: UploadEntry, pricePerPage: number): number {
  const rate = e.config.color === 'COLOR' ? pricePerPage * COLOR_MULTIPLIER : pricePerPage
  return pagesOf(e) * e.config.copies * rate
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="flex rounded-md bg-surface-2 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            'flex-1 rounded-[8px] px-2 py-2 text-subhead font-semibold transition-colors',
            value === o.value ? 'bg-surface text-text shadow-sm' : 'text-text-2',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function PrintConfigSheet({
  open,
  onOpenChange,
  seller,
  product,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  seller: Pick<Seller, 'id' | 'shopName' | 'pricePerPage'>
  product: Product | null
}) {
  const [step, setStep] = useState<'upload' | 'configure'>('upload')
  const [entries, setEntries] = useState<UploadEntry[]>([])
  const [activeIdx, setActiveIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const addPrinting = useAddPrintingItem()

  const pricePerPage = toNum(seller.pricePerPage, 2)
  const total = useMemo(
    () => entries.filter((e) => e.status === 'ready').reduce((s, e) => s + priceOf(e, pricePerPage), 0),
    [entries, pricePerPage],
  )
  const readyCount = entries.filter((e) => e.status === 'ready').length

  function patchEntry(key: string, patch: Partial<UploadEntry>) {
    setEntries((prev) => prev.map((e) => (e.key === key ? { ...e, ...patch } : e)))
  }
  function patchConfig(key: string, patch: Partial<UploadEntry['config']>) {
    setEntries((prev) => prev.map((e) => (e.key === key ? { ...e, config: { ...e.config, ...patch } } : e)))
  }

  async function handleFiles(fileList: FileList | null) {
    if (!fileList) return
    const files = Array.from(fileList)
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} exceeds the 25MB limit`)
        continue
      }
      entrySeq += 1
      const key = `e-${entrySeq}`
      const entry: UploadEntry = {
        key,
        name: file.name,
        sizeBytes: file.size,
        status: 'uploading',
        progress: 0,
        pageCount: 1,
        config: defaultConfig(1),
      }
      setEntries((prev) => [...prev, entry])
      try {
        const validated = await uploadFile(file, (p) => patchEntry(key, { progress: p }))
        const pageCount = validated.pageCount ?? 1
        patchEntry(key, {
          status: 'ready',
          progress: 100,
          fileId: validated.fileId,
          pageCount,
          config: defaultConfig(pageCount),
        })
      } catch (err) {
        patchEntry(key, { status: 'error' })
        toast.error(getErrorMessage(err, `Couldn't upload ${file.name}`))
      }
    }
  }

  function removeEntry(key: string) {
    setEntries((prev) => prev.filter((e) => e.key !== key))
  }

  function reset() {
    setEntries([])
    setStep('upload')
    setActiveIdx(0)
  }

  async function addToCart() {
    if (!product) return
    const ready = entries.filter((e) => e.status === 'ready' && e.fileId)
    if (!ready.length) return
    const files: PrintFileConfig[] = ready.map((e) => ({
      fileId: e.fileId!,
      payload: {
        originalName: e.name,
        pageCount: e.pageCount,
        color: e.config.color,
        paperSize: e.config.paperSize,
        copies: e.config.copies,
        pages: e.config.allPages ? 'all' : { from: e.config.fromPage, to: e.config.toPage },
        estimatedPrice: priceOf(e, pricePerPage),
      },
    }))
    try {
      await addPrinting.mutateAsync({
        sellerId: seller.id,
        productId: product.id,
        payload: { type: 'printing', productName: product.name },
        files,
      })
      toast.success(`Added to cart from ${seller.shopName}`)
      reset()
      onOpenChange(false)
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  const active = entries[activeIdx]

  return (
    <BottomSheet
      open={open}
      onOpenChange={(o) => {
        if (!o) reset()
        onOpenChange(o)
      }}
      title={step === 'upload' ? 'Upload your documents' : 'Configure print'}
      contentClassName="h-[88dvh]"
    >
      {step === 'upload' && (
        <div className="flex flex-col gap-3 pb-2">
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_FILE_TYPES}
            multiple
            hidden
            onChange={(e) => {
              handleFiles(e.target.files)
              e.target.value = ''
            }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border-strong bg-surface-2 px-6 py-8 text-center"
          >
            <span className="grid h-12 w-12 place-items-center rounded-full bg-primary-soft text-primary">
              <UploadCloud size={24} />
            </span>
            <span className="text-body font-semibold text-text">Tap to upload PDF or images</span>
            <span className="text-caption text-text-3">PDF, JPG, PNG up to 25MB</span>
          </button>

          {entries.map((e) => (
            <div key={e.key} className="flex items-center gap-3 rounded-md border border-border bg-surface p-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-surface-2 text-primary">
                <FileText size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-subhead font-semibold text-text">{e.name}</p>
                {e.status === 'uploading' && (
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${e.progress}%` }} />
                  </div>
                )}
                {e.status === 'ready' && (
                  <p className="text-caption text-text-2">
                    {e.pageCount} {e.pageCount === 1 ? 'page' : 'pages'} · {(e.sizeBytes / 1024 / 1024).toFixed(1)} MB
                  </p>
                )}
                {e.status === 'error' && <p className="text-caption text-danger">Upload failed</p>}
              </div>
              {e.status === 'uploading' && <Spinner size={18} />}
              {e.status === 'ready' && <CheckCircle2 size={20} className="text-success" />}
              {e.status === 'error' && <AlertCircle size={20} className="text-danger" />}
              <button onClick={() => removeEntry(e.key)} aria-label="Remove" className="text-text-3">
                <X size={18} />
              </button>
            </div>
          ))}

          {entries.length > 0 && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex items-center justify-center gap-1.5 rounded-md border border-border py-2.5 text-subhead font-semibold text-primary"
            >
              <Plus size={16} /> Add more files
            </button>
          )}

          <Button full size="lg" disabled={readyCount === 0} onClick={() => setStep('configure')} className="mt-1">
            Continue to configure
          </Button>
        </div>
      )}

      {step === 'configure' && active && (
        <div className="flex flex-col gap-4 pb-2">
          {/* File tabs */}
          <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
            {entries
              .filter((e) => e.status === 'ready')
              .map((e) => {
                const idx = entries.indexOf(e)
                return (
                  <button
                    key={e.key}
                    type="button"
                    onClick={() => setActiveIdx(idx)}
                    className={cn(
                      'shrink-0 rounded-full border-[1.5px] px-3 py-1.5 text-caption font-semibold',
                      idx === activeIdx ? 'border-primary bg-primary-soft text-on-primary-soft' : 'border-border text-text-2',
                    )}
                  >
                    {e.name.length > 16 ? e.name.slice(0, 14) + '…' : e.name} · {e.pageCount}p
                  </button>
                )
              })}
          </div>

          <div>
            <label className="mb-1.5 block text-subhead font-medium text-text-2">Colour</label>
            <Segmented
              value={active.config.color}
              onChange={(v) => patchConfig(active.key, { color: v })}
              options={[
                { value: 'BW', label: 'Black & White' },
                { value: 'COLOR', label: 'Colour' },
              ]}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-subhead font-medium text-text-2">Paper size</label>
            <Segmented
              value={active.config.paperSize}
              onChange={(v) => patchConfig(active.key, { paperSize: v })}
              options={[
                { value: 'A4', label: 'A4' },
                { value: 'A3', label: 'A3' },
                { value: 'LETTER', label: 'Letter' },
              ]}
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="text-subhead font-medium text-text-2">Copies</label>
            <Stepper value={active.config.copies} onChange={(n) => patchConfig(active.key, { copies: n })} min={1} max={500} size="sm" />
          </div>

          <div className="flex items-center justify-between">
            <label className="text-subhead font-medium text-text-2">All pages</label>
            <button
              type="button"
              role="switch"
              aria-checked={active.config.allPages}
              onClick={() => patchConfig(active.key, { allPages: !active.config.allPages })}
              className={cn('h-7 w-12 rounded-full p-0.5 transition-colors', active.config.allPages ? 'bg-primary' : 'bg-surface-3')}
            >
              <span className={cn('block h-6 w-6 rounded-full bg-white shadow-sm transition-transform', active.config.allPages && 'translate-x-5')} />
            </button>
          </div>

          {!active.config.allPages && (
            <div className="flex items-center gap-3">
              <label className="flex flex-1 items-center gap-2 rounded-md border border-border px-3 py-2">
                <span className="text-caption text-text-3">From</span>
                <input
                  type="number"
                  min={1}
                  max={active.pageCount}
                  value={active.config.fromPage}
                  onChange={(e) => patchConfig(active.key, { fromPage: Math.max(1, +e.target.value) })}
                  className="w-full bg-transparent text-body text-text outline-none mono-num"
                />
              </label>
              <label className="flex flex-1 items-center gap-2 rounded-md border border-border px-3 py-2">
                <span className="text-caption text-text-3">To</span>
                <input
                  type="number"
                  min={active.config.fromPage}
                  max={active.pageCount}
                  value={active.config.toPage}
                  onChange={(e) => patchConfig(active.key, { toPage: Math.min(active.pageCount, +e.target.value) })}
                  className="w-full bg-transparent text-body text-text outline-none mono-num"
                />
              </label>
            </div>
          )}

          {/* Live price */}
          <div className="rounded-md bg-surface-2 p-3.5">
            <p className="text-caption text-text-2">
              {pagesOf(active)} pages × {active.config.copies} {active.config.copies === 1 ? 'copy' : 'copies'} ×{' '}
              {money(active.config.color === 'COLOR' ? pricePerPage * COLOR_MULTIPLIER : pricePerPage)}/page
            </p>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-subhead font-medium text-text-2">This file</span>
              <span className="text-title font-bold text-text mono-num">{money(priceOf(active, pricePerPage))}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => setStep('upload')}>
              Back
            </Button>
            <Button full loading={addPrinting.isPending} icon={<Plus size={18} />} onClick={addToCart}>
              Add to cart — {money(total)}
            </Button>
          </div>
        </div>
      )}
    </BottomSheet>
  )
}
