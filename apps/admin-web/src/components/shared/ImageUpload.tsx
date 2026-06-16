import { useRef, useState } from 'react'
import { ImagePlus, Loader2, X } from 'lucide-react'
import { uploadImage, ACCEPTED_IMAGE_TYPES, MAX_IMAGE_SIZE } from '@/api/hooks/useFiles'
import { assetUrl } from '@/lib/format'
import { toast } from '@/stores/toastStore'
import { getErrorMessage } from '@/api/client'
import { cn } from '@/lib/cn'

interface ImageUploadProps {
  /** Current stored S3 path (imagePath / iconPath). */
  value: string | null | undefined
  onChange: (path: string) => void
  label?: string
  /** Aspect ratio of the drop zone. */
  aspect?: 'video' | 'square'
  className?: string
}

/** Click-to-upload image field: presigned URL → PUT → returns the S3 key. */
export function ImageUpload({
  value,
  onChange,
  label,
  aspect = 'video',
  className,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const preview = assetUrl(value)

  async function handleFile(file: File) {
    if (file.size > MAX_IMAGE_SIZE) {
      toast.error('Image must be under 10 MB')
      return
    }
    setBusy(true)
    try {
      const { path } = await uploadImage(file)
      onChange(path)
    } catch (e) {
      toast.error(getErrorMessage(e, 'Upload failed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={cn('flex flex-col gap-[7px]', className)}>
      {label && <span className="text-subhead font-medium text-text-2">{label}</span>}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={cn(
          'group relative grid w-full place-items-center overflow-hidden rounded-lg border-[1.5px] border-dashed border-border bg-surface-2 text-text-3 transition-colors hover:border-primary',
          aspect === 'video' ? 'aspect-video' : 'aspect-square',
        )}
      >
        {preview ? (
          <>
            <img src={preview} alt="" className="h-full w-full object-cover" />
            <span className="absolute inset-0 grid place-items-center bg-black/0 text-white opacity-0 transition-opacity group-hover:bg-black/40 group-hover:opacity-100">
              <ImagePlus size={22} />
            </span>
          </>
        ) : (
          <span className="flex flex-col items-center gap-1.5 py-6 text-subhead">
            {busy ? <Loader2 size={22} className="animate-spin" /> : <ImagePlus size={22} />}
            {busy ? 'Uploading…' : 'Click to upload'}
          </span>
        )}
        {busy && preview && (
          <span className="absolute inset-0 grid place-items-center bg-black/40 text-white">
            <Loader2 size={22} className="animate-spin" />
          </span>
        )}
      </button>
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="inline-flex items-center gap-1 self-start text-caption text-danger"
        >
          <X size={13} /> Remove
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) void handleFile(f)
          e.target.value = ''
        }}
      />
    </div>
  )
}
