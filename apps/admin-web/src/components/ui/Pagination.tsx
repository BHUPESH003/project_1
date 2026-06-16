import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/cn'

interface PaginationProps {
  page: number
  totalPages: number
  total?: number
  onPageChange: (page: number) => void
}

/** Build a compact page list: 1 … 4 5 [6] 7 8 … 20 */
function pageItems(page: number, totalPages: number): (number | '…')[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
  const items: (number | '…')[] = [1]
  const start = Math.max(2, page - 1)
  const end = Math.min(totalPages - 1, page + 1)
  if (start > 2) items.push('…')
  for (let i = start; i <= end; i++) items.push(i)
  if (end < totalPages - 1) items.push('…')
  items.push(totalPages)
  return items
}

export function Pagination({ page, totalPages, total, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null
  const items = pageItems(page, totalPages)

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <span className="text-caption text-text-3">
        {total != null ? `${total} total` : `Page ${page} of ${totalPages}`}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
          className="tap grid h-8 w-8 place-items-center rounded-md border border-border text-text-2 disabled:opacity-40 hover:enabled:bg-surface-2"
        >
          <ChevronLeft size={16} />
        </button>
        {items.map((it, i) =>
          it === '…' ? (
            <span key={`g-${i}`} className="px-1 text-caption text-text-3">
              …
            </span>
          ) : (
            <button
              key={it}
              onClick={() => onPageChange(it)}
              className={cn(
                'h-8 min-w-8 rounded-md px-2 text-subhead font-semibold tabular-nums',
                it === page
                  ? 'bg-primary text-on-primary'
                  : 'border border-border text-text-2 hover:bg-surface-2',
              )}
            >
              {it}
            </button>
          ),
        )}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Next page"
          className="tap grid h-8 w-8 place-items-center rounded-md border border-border text-text-2 disabled:opacity-40 hover:enabled:bg-surface-2"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}
