import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Home as HomeIcon, Store, MapPin, Trash2, Plus } from 'lucide-react'
import { useAddresses, useCreateAddress, useDeleteAddress } from '@/api/hooks/useUser'
import { AddressOverlay } from '@/components/sheets/AddressOverlay'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { toast } from '@/stores/toastStore'
import { getErrorMessage } from '@/api/client'
import type { SelectedAddress } from '@/stores/addressStore'

function addrIcon(label: string) {
  const l = label.toLowerCase()
  if (l.includes('home')) return HomeIcon
  if (l.includes('office') || l.includes('work')) return Store
  return MapPin
}

export function AddressesPage() {
  const navigate = useNavigate()
  const { data, isLoading, isError, refetch } = useAddresses()
  const createAddress = useCreateAddress()
  const deleteAddress = useDeleteAddress()
  const [sheetOpen, setSheetOpen] = useState(false)

  async function handleCommit(addr: SelectedAddress) {
    if (addr.id) return // already a saved address
    try {
      await createAddress.mutateAsync({
        label: addr.label,
        addressLine: addr.addressLine,
        latitude: addr.latitude,
        longitude: addr.longitude,
      })
      toast.success('Address saved')
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  return (
    <div className="px-5 pb-28 pt-3">
      <div className="mb-4 flex items-center gap-2">
        <button onClick={() => navigate(-1)} aria-label="Back" className="tap -ml-2 grid h-10 w-10 place-items-center text-text-2">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-title-lg font-bold text-text">Saved addresses</h1>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full rounded-lg" />
          <Skeleton className="h-20 w-full rounded-lg" />
        </div>
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} message="Couldn't load addresses." />
      ) : !data?.length ? (
        <EmptyState
          icon={<MapPin size={32} />}
          title="No saved addresses"
          description="Add an address for faster checkout."
          action={<Button icon={<Plus size={18} />} onClick={() => setSheetOpen(true)}>Add address</Button>}
        />
      ) : (
        <div className="space-y-3">
          {data.map((a) => {
            const Icon = addrIcon(a.label)
            return (
              <div key={a.id} className="flex items-start gap-3 rounded-lg border border-border bg-surface p-4">
                <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-2 text-primary">
                  <Icon size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-body font-semibold text-text">{a.label}</p>
                  <p className="text-subhead text-text-2">{a.addressLine}</p>
                  {a.receiverName && <p className="mt-0.5 text-caption text-text-3">{a.receiverName}</p>}
                </div>
                <button
                  onClick={() => deleteAddress.mutate(a.id)}
                  aria-label="Delete"
                  className="text-text-3 hover:text-danger"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {!!data?.length && (
        <Button variant="secondary" full className="mt-4" icon={<Plus size={18} />} onClick={() => setSheetOpen(true)}>
          Add new address
        </Button>
      )}

      <AddressOverlay open={sheetOpen} onOpenChange={setSheetOpen} requireDetails onCommit={handleCommit} />
    </div>
  )
}
