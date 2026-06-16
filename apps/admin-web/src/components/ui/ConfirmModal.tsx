import { useState } from 'react'
import type { ReactNode } from 'react'
import { Modal } from './Modal'
import { Button } from './Button'
import { getErrorMessage } from '@/api/client'
import { toast } from '@/stores/toastStore'

interface ConfirmModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  /** Body message / description shown above any reason input. */
  message?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  /** Danger styling for the confirm button (destructive actions). */
  danger?: boolean
  /** Show a required-reason textarea; the value is passed to onConfirm. */
  requireReason?: boolean
  reasonLabel?: string
  reasonPlaceholder?: string
  /** Extra fields rendered between the message and the reason input. */
  children?: ReactNode
  /** Async action. Throw to keep the modal open and surface a toast. */
  onConfirm: (reason: string) => Promise<void> | void
}

/**
 * Confirmation dialog for destructive admin actions. Every cancel/suspend/
 * reject/delete action routes through this so nothing is one-click.
 */
export function ConfirmModal({
  open,
  onOpenChange,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger,
  requireReason,
  reasonLabel = 'Reason',
  reasonPlaceholder = 'Enter a reason…',
  children,
  onConfirm,
}: ConfirmModalProps) {
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)

  const canConfirm = !requireReason || reason.trim().length > 0

  /** Reset transient state on close so the next open starts clean. */
  function handleOpenChange(next: boolean) {
    if (busy) return
    if (!next) {
      setReason('')
      setBusy(false)
    }
    onOpenChange(next)
  }

  async function confirm() {
    if (!canConfirm || busy) return
    setBusy(true)
    try {
      await onConfirm(reason.trim())
      setReason('')
      setBusy(false)
      onOpenChange(false)
    } catch (e) {
      toast.error(getErrorMessage(e))
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={handleOpenChange}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={() => handleOpenChange(false)} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button
            variant={danger ? 'danger' : 'primary'}
            loading={busy}
            disabled={!canConfirm}
            onClick={confirm}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {message && <div className="text-body text-text-2">{message}</div>}
      {children && <div className="mt-4">{children}</div>}
      {requireReason && (
        <label className="mt-4 flex flex-col gap-1.5">
          <span className="text-subhead font-medium text-text-2">{reasonLabel}</span>
          <textarea
            autoFocus
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={reasonPlaceholder}
            className="resize-none rounded-md border-[1.5px] border-border bg-surface px-3 py-2 text-body text-text outline-none placeholder:text-text-3 focus:border-primary focus:shadow-[0_0_0_3px_var(--primary-soft)]"
          />
        </label>
      )}
    </Modal>
  )
}
