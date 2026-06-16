import { useState } from 'react'
import { Plus, Save, X } from 'lucide-react'
import { CategoryStatus } from '@repo/types'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Select } from '@/components/ui/Select'
import { Spinner } from '@/components/ui/Spinner'
import { ErrorState } from '@/components/ui/States'
import { ImageUpload } from '@/components/shared/ImageUpload'
import {
  useCategories,
  useCreateCategory,
  useUpdateCategory,
} from '@/api/hooks/useCategories'
import { toast } from '@/stores/toastStore'
import { getErrorMessage } from '@/api/client'
import type { Category } from '@/types/api'

const SLUG_RE = /^[a-z0-9-]+$/
const STATUS_OPTIONS = [
  { value: CategoryStatus.ACTIVE, label: 'Active' },
  { value: CategoryStatus.COMING_SOON, label: 'Coming soon' },
  { value: CategoryStatus.INACTIVE, label: 'Inactive' },
]

interface Draft {
  id: string
  name: string
  status: CategoryStatus
  displayOrder: number
  iconPath: string | null
}

export function CategoriesPage() {
  const { data, isLoading, isError, refetch } = useCategories()
  const [newRow, setNewRow] = useState<Draft | null>(null)

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-title-lg font-bold text-text">Categories</h1>
          <p className="text-subhead text-text-2">Marketplace categories shown to customers</p>
        </div>
        <Button
          icon={<Plus size={16} />}
          disabled={!!newRow}
          onClick={() =>
            setNewRow({ id: '', name: '', status: CategoryStatus.COMING_SOON, displayOrder: 0, iconPath: null })
          }
        >
          Add category
        </Button>
      </div>

      {isLoading ? (
        <div className="grid place-items-center py-16 text-text-3">
          <Spinner size={28} />
        </div>
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-surface-2 text-left text-caption font-semibold uppercase tracking-wide text-text-3">
                <th className="px-4 py-3" style={{ width: '80px' }}>Icon</th>
                <th className="px-4 py-3" style={{ width: '180px' }}>Slug</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3" style={{ width: '180px' }}>Status</th>
                <th className="px-4 py-3" style={{ width: '110px' }}>Order</th>
                <th className="px-4 py-3" style={{ width: '120px' }} />
              </tr>
            </thead>
            <tbody>
              {newRow && (
                <CategoryRow draft={newRow} isNew onDoneNew={() => setNewRow(null)} />
              )}
              {(data ?? []).map((c) => (
                <CategoryRow key={c.id} category={c} />
              ))}
              {(!data || data.length === 0) && !newRow && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-subhead text-text-3">
                    No categories yet. Add the first one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function CategoryRow({
  category,
  draft,
  isNew,
  onDoneNew,
}: {
  category?: Category
  draft?: Draft
  isNew?: boolean
  onDoneNew?: () => void
}) {
  const create = useCreateCategory()
  const update = useUpdateCategory()
  const init: Draft = category
    ? {
        id: category.id,
        name: category.name,
        status: category.status,
        displayOrder: category.displayOrder,
        iconPath: category.iconPath,
      }
    : draft!
  const [row, setRow] = useState<Draft>(init)

  const slugValid = !isNew || SLUG_RE.test(row.id)
  const canSave = row.name.trim() && (isNew ? slugValid : true)

  async function save() {
    if (!canSave) return
    try {
      if (isNew) {
        await create.mutateAsync({
          id: row.id,
          name: row.name,
          status: row.status,
          displayOrder: row.displayOrder,
          iconPath: row.iconPath ?? undefined,
        })
        toast.success('Category created')
        onDoneNew?.()
      } else {
        await update.mutateAsync({
          id: row.id,
          input: {
            name: row.name,
            status: row.status,
            displayOrder: row.displayOrder,
            iconPath: row.iconPath ?? undefined,
          },
        })
        toast.success('Category updated')
      }
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  const busy = create.isPending || update.isPending

  return (
    <tr className="border-t border-border-faint align-middle">
      <td className="px-4 py-3">
        <div className="h-12 w-12">
          <ImageUpload value={row.iconPath} onChange={(p) => setRow({ ...row, iconPath: p })} aspect="square" />
        </div>
      </td>
      <td className="px-4 py-3">
        {isNew ? (
          <Field
            value={row.id}
            onChange={(e) => setRow({ ...row, id: e.target.value })}
            placeholder="printing"
            error={row.id && !slugValid ? 'lowercase, digits, hyphens' : undefined}
          />
        ) : (
          <span className="mono-num text-subhead text-text-2">{row.id}</span>
        )}
      </td>
      <td className="px-4 py-3">
        <Field value={row.name} onChange={(e) => setRow({ ...row, name: e.target.value })} placeholder="Printing" />
      </td>
      <td className="px-4 py-3">
        <Select
          value={row.status}
          options={STATUS_OPTIONS}
          onChange={(e) => setRow({ ...row, status: e.target.value as CategoryStatus })}
        />
      </td>
      <td className="px-4 py-3">
        <Field
          type="number"
          value={String(row.displayOrder)}
          onChange={(e) => setRow({ ...row, displayOrder: Number(e.target.value) })}
        />
      </td>
      <td className="px-4 py-3">
        <div className="flex justify-end gap-1.5">
          <Button size="sm" icon={<Save size={14} />} loading={busy} disabled={!canSave} onClick={save}>
            Save
          </Button>
          {isNew && (
            <button
              onClick={onDoneNew}
              aria-label="Discard"
              className="tap grid h-9 w-9 place-items-center rounded-md border border-border text-text-2 hover:bg-surface-2"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </td>
    </tr>
  )
}
