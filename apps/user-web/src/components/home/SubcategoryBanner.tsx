import { useNavigate } from 'react-router-dom'
import { useSubcategories } from '@/api/hooks/useCatalog'
import { Skeleton } from '@/components/ui/Skeleton'

/**
 * Horizontal chip rail of product sub-categories for the selected seller category.
 * Tapping a chip navigates to /browse?categoryId=X&sub=Y which lists all products
 * in that sub-category from every seller, sorted newest first.
 */
export function SubcategoryBanner({ categoryId }: { categoryId: string }) {
  const navigate = useNavigate()
  const { data, isLoading } = useSubcategories(categoryId)

  if (isLoading) {
    return (
      <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 py-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-24 shrink-0 rounded-full" />
        ))}
      </div>
    )
  }

  if (!data?.length) return null

  return (
    <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 py-1">
      {data.map((sub) => (
        <button
          key={sub.name}
          type="button"
          onClick={() =>
            navigate(
              `/browse?categoryId=${encodeURIComponent(categoryId)}&sub=${encodeURIComponent(sub.name)}`,
            )
          }
          className="tap inline-flex shrink-0 items-center gap-1.5 rounded-full border border-primary/25 bg-primary-soft px-3.5 py-1.5 text-caption font-semibold text-primary"
        >
          {sub.name}
          <span className="mono-num rounded-full bg-primary/10 px-1.5 py-px text-[9px] font-bold">
            {sub.count}
          </span>
        </button>
      ))}
    </div>
  )
}
