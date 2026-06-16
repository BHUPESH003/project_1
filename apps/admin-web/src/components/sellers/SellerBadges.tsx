import { SellerStatus } from '@repo/types'
import { Badge } from '@/components/ui/Badge'
import type { AdminSeller } from '@/types/api'

export function SellerStatusBadge({ status }: { status: SellerStatus }) {
  return (
    <Badge tone={status === SellerStatus.ONLINE ? 'success' : 'neutral'}>
      {status === SellerStatus.ONLINE ? 'Online' : 'Offline'}
    </Badge>
  )
}

/** Compact row of state chips: verified / suspended / trending. */
export function SellerFlags({ seller }: { seller: AdminSeller }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {seller.isSuspended && <Badge tone="danger">Suspended</Badge>}
      <Badge tone={seller.isVerified ? 'success' : 'warning'}>
        {seller.isVerified ? 'Verified' : 'Unverified'}
      </Badge>
      {seller.isTrending && <Badge tone="primary">Trending</Badge>}
    </div>
  )
}
