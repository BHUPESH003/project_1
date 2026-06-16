import type { ReactNode } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'

interface ModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: ReactNode
  description?: ReactNode
  children?: ReactNode
  footer?: ReactNode
  /** Max width of the dialog panel. */
  size?: 'sm' | 'md' | 'lg'
  /** Hide the close (X) button in the header. */
  hideClose?: boolean
}

const sizeCls = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
}

/**
 * Centered desktop dialog built on Radix. Closes on overlay click and Escape
 * (Radix handles the Escape key natively).
 */
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = 'md',
  hideClose,
}: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="fixed inset-0 z-[90] bg-[var(--scrim)] backdrop-blur-[2px]"
              />
            </Dialog.Overlay>
            <Dialog.Content asChild forceMount>
              <motion.div
                initial={{ opacity: 0, scale: 0.97, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97, y: 8 }}
                transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                className={cn(
                  'fixed left-1/2 top-1/2 z-[95] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2',
                  'flex max-h-[88vh] flex-col rounded-xl border border-border bg-surface shadow-lg',
                  sizeCls[size],
                )}
              >
                {(title || !hideClose) && (
                  <div className="flex items-start justify-between gap-4 border-b border-border-faint px-5 py-4">
                    <div className="min-w-0">
                      {title && (
                        <Dialog.Title className="text-title font-bold text-text">
                          {title}
                        </Dialog.Title>
                      )}
                      {description && (
                        <Dialog.Description className="mt-1 text-subhead text-text-2">
                          {description}
                        </Dialog.Description>
                      )}
                    </div>
                    {!hideClose && (
                      <Dialog.Close
                        className="tap -mr-1 grid h-8 w-8 shrink-0 place-items-center rounded-md text-text-3 hover:bg-surface-2 hover:text-text"
                        aria-label="Close"
                      >
                        <X size={18} />
                      </Dialog.Close>
                    )}
                  </div>
                )}
                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
                {footer && (
                  <div className="flex items-center justify-end gap-2 border-t border-border-faint px-5 py-4">
                    {footer}
                  </div>
                )}
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  )
}
