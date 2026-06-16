import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Pencil, Trash2, ChevronUp, ChevronDown, Image as ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Switch } from '@/components/ui/Switch'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { ErrorState, EmptyState } from '@/components/ui/States'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import {
  useBanners,
  useUpdateBanner,
  useDeleteBanner,
} from '@/api/hooks/useBanners'
import { toast } from '@/stores/toastStore'
import { getErrorMessage } from '@/api/client'
import { assetUrl } from '@/lib/format'
import type { Banner } from '@/types/api'

export function BannersListPage() {
  const navigate = useNavigate()
  const { data, isLoading, isError, refetch } = useBanners()
  const update = useUpdateBanner()
  const del = useDeleteBanner()
  const [deleteTarget, setDeleteTarget] = useState<Banner | null>(null)

  const banners = useMemo(
    () => [...(data ?? [])].sort((a, b) => a.displayOrder - b.displayOrder),
    [data],
  )

  async function toggleActive(b: Banner, isActive: boolean) {
    try {
      await update.mutateAsync({ id: b.id, input: { isActive } })
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  // Swap displayOrder with the adjacent banner.
  async function move(index: number, dir: -1 | 1) {
    const a = banners[index]
    const b = banners[index + dir]
    if (!a || !b) return
    try {
      await Promise.all([
        update.mutateAsync({ id: a.id, input: { displayOrder: b.displayOrder } }),
        update.mutateAsync({ id: b.id, input: { displayOrder: a.displayOrder } }),
      ])
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-title-lg font-bold text-text">Banners</h1>
          <p className="text-subhead text-text-2">Promotional banners shown in the user app</p>
        </div>
        <Button icon={<Plus size={16} />} onClick={() => navigate('/banners/new')}>
          Add banner
        </Button>
      </div>

      {isLoading ? (
        <div className="grid place-items-center py-16 text-text-3">
          <Spinner size={28} />
        </div>
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : banners.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface">
          <EmptyState
            icon={<ImageIcon size={32} />}
            title="No banners yet"
            description="Create your first promotional banner."
            action={<Button onClick={() => navigate('/banners/new')}>Add banner</Button>}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {banners.map((b, i) => (
            <div key={b.id} className="overflow-hidden rounded-xl border border-border bg-surface">
              <div className="relative aspect-video bg-surface-2">
                {assetUrl(b.imagePath) ? (
                  <img src={assetUrl(b.imagePath)} alt={b.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full place-items-center text-text-3">
                    <ImageIcon size={28} />
                  </div>
                )}
                {b.badge && (
                  <span className="absolute left-3 top-3">
                    <Badge tone="primary" soft={false}>
                      {b.badge}
                    </Badge>
                  </span>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-body font-semibold text-text">{b.title}</p>
                    {b.subtitle && <p className="truncate text-subhead text-text-2">{b.subtitle}</p>}
                  </div>
                  <Switch
                    checked={b.isActive}
                    onCheckedChange={(v) => toggleActive(b, v)}
                    aria-label="Active"
                  />
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => move(i, -1)}
                      disabled={i === 0}
                      aria-label="Move up"
                      className="tap grid h-8 w-8 place-items-center rounded-md border border-border text-text-2 disabled:opacity-40 hover:enabled:bg-surface-2"
                    >
                      <ChevronUp size={15} />
                    </button>
                    <button
                      onClick={() => move(i, 1)}
                      disabled={i === banners.length - 1}
                      aria-label="Move down"
                      className="tap grid h-8 w-8 place-items-center rounded-md border border-border text-text-2 disabled:opacity-40 hover:enabled:bg-surface-2"
                    >
                      <ChevronDown size={15} />
                    </button>
                    <span className="ml-1 text-caption text-text-3">#{b.displayOrder}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => navigate(`/banners/${b.id}/edit`)}
                      aria-label="Edit"
                      className="tap grid h-8 w-8 place-items-center rounded-md border border-border text-text-2 hover:bg-surface-2"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(b)}
                      aria-label="Delete"
                      className="tap grid h-8 w-8 place-items-center rounded-md border border-border text-danger hover:bg-danger-soft"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete banner"
        danger
        confirmLabel="Delete"
        message={
          deleteTarget ? (
            <>
              Delete banner <b className="text-text">{deleteTarget.title}</b>? This cannot be undone.
            </>
          ) : null
        }
        onConfirm={async () => {
          if (!deleteTarget) return
          await del.mutateAsync(deleteTarget.id)
          toast.success('Banner deleted')
          setDeleteTarget(null)
        }}
      />
    </div>
  )
}
