import type { ReactNode } from 'react'
import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Skeleton } from './Skeleton'
import { EmptyState, ErrorState } from './States'
import { Pagination } from './Pagination'

export type SortDir = 'asc' | 'desc'
export interface SortState {
  key: string
  dir: SortDir
}

export interface Column<T> {
  key: string
  header: ReactNode
  /** Cell renderer. Defaults to String(row[key]). */
  render?: (row: T) => ReactNode
  sortable?: boolean
  align?: 'left' | 'right' | 'center'
  /** Fixed column width (e.g. '120px') — prevents layout shift. */
  width?: string
}

interface TableProps<T> {
  columns: Column<T>[]
  data: T[] | undefined
  rowKey: (row: T) => string
  loading?: boolean
  error?: boolean
  onRetry?: () => void
  emptyTitle?: string
  emptyDescription?: string
  emptyIcon?: ReactNode
  onRowClick?: (row: T) => void
  sort?: SortState
  onSortChange?: (sort: SortState) => void
  pagination?: {
    page: number
    totalPages: number
    total?: number
    onPageChange: (page: number) => void
  }
  /** Number of skeleton rows to show while loading. */
  skeletonRows?: number
}

const alignCls = { left: 'text-left', right: 'text-right', center: 'text-center' }

/**
 * Reusable controlled data table — server-side sort + pagination. Renders its
 * own loading skeleton, error and empty states so every list page is
 * consistent and free of layout shift (column widths are fixed by `width`).
 */
export function Table<T>({
  columns,
  data,
  rowKey,
  loading,
  error,
  onRetry,
  emptyTitle = 'Nothing here yet',
  emptyDescription,
  emptyIcon,
  onRowClick,
  sort,
  onSortChange,
  pagination,
  skeletonRows = 8,
}: TableProps<T>) {
  function toggleSort(key: string) {
    if (!onSortChange) return
    const dir: SortDir = sort?.key === key && sort.dir === 'desc' ? 'asc' : 'desc'
    onSortChange({ key, dir })
  }

  const body = () => {
    if (error) {
      return (
        <tr>
          <td colSpan={columns.length}>
            <ErrorState message="Could not load this list." onRetry={onRetry} />
          </td>
        </tr>
      )
    }
    if (loading) {
      return Array.from({ length: skeletonRows }).map((_, r) => (
        <tr key={`s-${r}`} className="border-t border-border-faint">
          {columns.map((c) => (
            <td key={c.key} className="px-4 py-3.5">
              <Skeleton className="h-4 w-[70%]" />
            </td>
          ))}
        </tr>
      ))
    }
    if (!data || data.length === 0) {
      return (
        <tr>
          <td colSpan={columns.length}>
            <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} />
          </td>
        </tr>
      )
    }
    return data.map((row) => (
      <tr
        key={rowKey(row)}
        onClick={onRowClick ? () => onRowClick(row) : undefined}
        className={cn(
          'border-t border-border-faint transition-colors',
          onRowClick && 'cursor-pointer hover:bg-surface-2',
        )}
      >
        {columns.map((c) => (
          <td
            key={c.key}
            className={cn('px-4 py-3.5 text-subhead text-text', alignCls[c.align ?? 'left'])}
          >
            {c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? '')}
          </td>
        ))}
      </tr>
    ))
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-surface-2">
              {columns.map((c) => {
                const active = sort?.key === c.key
                return (
                  <th
                    key={c.key}
                    style={c.width ? { width: c.width } : undefined}
                    className={cn(
                      'whitespace-nowrap px-4 py-3 text-caption font-semibold uppercase tracking-wide text-text-3',
                      alignCls[c.align ?? 'left'],
                    )}
                  >
                    {c.sortable ? (
                      <button
                        onClick={() => toggleSort(c.key)}
                        className={cn(
                          'inline-flex items-center gap-1 hover:text-text-2',
                          active && 'text-text',
                          c.align === 'right' && 'flex-row-reverse',
                        )}
                      >
                        {c.header}
                        {active ? (
                          sort.dir === 'desc' ? (
                            <ChevronDown size={13} />
                          ) : (
                            <ChevronUp size={13} />
                          )
                        ) : (
                          <ChevronsUpDown size={13} className="opacity-50" />
                        )}
                      </button>
                    ) : (
                      c.header
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>{body()}</tbody>
        </table>
      </div>
      {pagination && !loading && !error && data && data.length > 0 && (
        <div className="border-t border-border-faint">
          <Pagination {...pagination} />
        </div>
      )}
    </div>
  )
}
