import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Bell, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'

const DISMISS_KEY = 'push-permission-dismissed'

interface Props {
  onEnable: () => Promise<void>
}

/**
 * Shown once to users who haven't granted notification permission yet.
 * The "Enable" button is the user gesture that lets the browser show the
 * native permission dialog (automatic calls are blocked by most browsers).
 */
export function PushPermissionBanner({ onEnable }: Props) {
  const [visible, setVisible] = useState(
    () => !localStorage.getItem(DISMISS_KEY),
  )
  const [loading, setLoading] = useState(false)

  function dismiss() {
    setVisible(false)
    localStorage.setItem(DISMISS_KEY, '1')
  }

  async function handleEnable() {
    setLoading(true)
    try {
      await onEnable()
    } finally {
      setLoading(false)
      dismiss()
    }
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 30 }}
          className="fixed inset-x-0 top-0 z-[90] mx-auto max-w-[430px] px-3 pt-3"
        >
          <div className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3 shadow-float">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Bell size={18} className="text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-subhead font-semibold text-text">Stay updated</p>
              <p className="text-caption text-text-2">Get order updates as push notifications.</p>
            </div>
            <Button size="sm" onClick={handleEnable} disabled={loading}>
              {loading ? 'Enabling…' : 'Enable'}
            </Button>
            <button onClick={dismiss} aria-label="Dismiss" className="text-text-3 hover:text-text">
              <X size={18} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
