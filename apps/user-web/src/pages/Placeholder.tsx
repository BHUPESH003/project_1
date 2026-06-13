import { Hammer } from 'lucide-react'
import { EmptyState } from '@/components/ui/States'

/** Temporary placeholder for screens delivered in later build phases. */
export function Placeholder({ name }: { name: string }) {
  return (
    <div className="px-5 pt-8">
      <EmptyState icon={<Hammer size={32} />} title={name} description="This screen is coming up in a later build phase." />
    </div>
  )
}
