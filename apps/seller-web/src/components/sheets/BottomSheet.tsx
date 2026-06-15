import type { ReactNode } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '@/lib/cn'

interface BottomSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  children: ReactNode
  /** Disable dismiss via overlay/escape (e.g. mandatory address on first launch). */
  dismissible?: boolean
  contentClassName?: string
}

/**
 * A bottom sheet built on Radix Dialog (focus trap, a11y) + Framer Motion
 * slide-up spring. Constrained to the 430px app container.
 */
export function BottomSheet({
  open,
  onOpenChange,
  title,
  children,
  dismissible = true,
  contentClassName,
}: BottomSheetProps) {
  return (
    <Dialog.Root open={open} onOpenChange={dismissible ? onOpenChange : undefined}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-[90]"
                style={{ background: 'var(--scrim)', backdropFilter: 'blur(2px)' }}
              />
            </Dialog.Overlay>
            <Dialog.Content
              asChild
              onEscapeKeyDown={(e) => !dismissible && e.preventDefault()}
              onInteractOutside={(e) => !dismissible && e.preventDefault()}
              aria-describedby={undefined}
            >
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 240 }}
                className={cn(
                  'fixed bottom-0 left-1/2 z-[91] flex max-h-[88dvh] w-full max-w-[430px] -translate-x-1/2 flex-col',
                  'rounded-t-[24px] bg-surface shadow-float',
                  contentClassName,
                )}
              >
                <div className="flex justify-center pt-2.5 pb-1">
                  <span className="h-1 w-10 rounded-full bg-border-strong" />
                </div>
                {title && (
                  <Dialog.Title className="px-5 pt-1 pb-2 text-title-lg font-bold text-text">
                    {title}
                  </Dialog.Title>
                )}
                {!title && <Dialog.Title className="sr-only">Sheet</Dialog.Title>}
                <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-[max(20px,env(safe-area-inset-bottom))]">
                  {children}
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  )
}
