import { useState } from 'react'
import { MapPin, User, Phone } from 'lucide-react'
import { BottomSheet } from './BottomSheet'
import { Field } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { useCreateAddress } from '@/api/hooks/useUser'
import { useUpdateAddress } from '@/api/hooks/useUser'
import { useAddressStore, type SelectedAddress } from '@/stores/addressStore'
import { toast } from '@/stores/toastStore'

interface Props {
  open: boolean
  onClose: () => void
  /** Called with the completed address after saving. Use this to immediately proceed (e.g. call pay()). */
  onComplete: (addr: SelectedAddress) => void
}

/**
 * Shown at order placement time when the selected address is missing receiver
 * details (name / full delivery line). Never shown during initial location setup.
 */
export function AddressCompleteSheet({ open, onClose, onComplete }: Props) {
  const address = useAddressStore((s) => s.selectedAddress)
  const setAddress = useAddressStore((s) => s.setAddress)
  const createAddress = useCreateAddress()
  const updateAddress = useUpdateAddress()

  const [addressLine, setAddressLine] = useState('')
  const [receiverName, setReceiverName] = useState('')
  const [receiverPhone, setReceiverPhone] = useState('')

  // Pre-fill from address store when the sheet opens
  function handleOpen() {
    setAddressLine(address?.addressLine ?? '')
    setReceiverName(address?.receiverName ?? '')
    setReceiverPhone(address?.receiverPhone ?? '')
  }

  const isBusy = createAddress.isPending || updateAddress.isPending
  const canSubmit = receiverName.trim().length > 0 && addressLine.trim().length > 0

  async function handleSubmit() {
    if (!address || !canSubmit) return

    const patch = {
      addressLine: addressLine.trim(),
      receiverName: receiverName.trim(),
      receiverPhone: receiverPhone.trim() || null,
    }

    try {
      let savedId = address.id

      if (address.id) {
        // Update existing saved address with receiver info
        await updateAddress.mutateAsync({ id: address.id, ...patch })
      } else {
        // Create a new saved address so checkout gets a valid addressId
        const saved = await createAddress.mutateAsync({
          label: address.label,
          addressLine: patch.addressLine,
          receiverName: patch.receiverName,
          receiverPhone: patch.receiverPhone ?? undefined,
          latitude: address.latitude,
          longitude: address.longitude,
        })
        savedId = saved.id
      }

      const complete: SelectedAddress = {
        ...address,
        id: savedId,
        addressLine: patch.addressLine,
        receiverName: patch.receiverName,
        receiverPhone: patch.receiverPhone,
      }
      setAddress(complete)
      onClose()
      onComplete(complete)
    } catch {
      toast.error('Could not save address. Please try again.')
    }
  }

  return (
    <BottomSheet
      open={open}
      onOpenChange={(o) => {
        if (o) handleOpen()
        else onClose()
      }}
      title="Complete delivery details"
    >
      <div className="flex flex-col gap-4 pb-2">
        <p className="text-subhead text-text-2">
          We need a few more details to deliver to you.
        </p>

        {/* Location badge — non-editable */}
        {address && (
          <div className="flex items-center gap-2.5 rounded-lg bg-primary-soft px-3 py-2.5">
            <MapPin size={16} className="shrink-0 text-primary" />
            <span className="truncate text-subhead font-semibold text-text">
              {address.label}
            </span>
          </div>
        )}

        {/* Full address line */}
        <Field
          label="Full address"
          leading={<MapPin size={18} />}
          placeholder="Flat / building / street…"
          value={addressLine}
          onChange={(e) => setAddressLine(e.target.value)}
          autoComplete="street-address"
        />

        {/* Receiver name */}
        <Field
          label="Your name"
          leading={<User size={18} />}
          placeholder="Name for delivery"
          value={receiverName}
          onChange={(e) => setReceiverName(e.target.value)}
          autoComplete="name"
        />

        {/* Receiver phone */}
        <Field
          label="Phone number (optional)"
          leading={<Phone size={18} />}
          placeholder="10-digit mobile number"
          value={receiverPhone}
          onChange={(e) => setReceiverPhone(e.target.value)}
          inputMode="tel"
          autoComplete="tel"
        />

        <Button
          full
          size="lg"
          disabled={!canSubmit}
          loading={isBusy}
          onClick={handleSubmit}
        >
          Save and place order
        </Button>
      </div>
    </BottomSheet>
  )
}
