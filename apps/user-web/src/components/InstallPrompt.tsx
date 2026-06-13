import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Download, X, Share } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { isIos, isStandalone, type BeforeInstallPromptEvent } from '@/lib/pwa'

const DISMISS_KEY = 'pwa-install-dismissed'

/**
 * Prompts the user to install the app as a PWA.
 * - Chromium/Android: uses the captured `beforeinstallprompt` event.
 * - iOS Safari: shows manual "Add to Home Screen" instructions (no event there).
 * Hidden when already installed or previously dismissed.
 */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)
  const [iosHint, setIosHint] = useState(false)

  useEffect(() => {
    if (isStandalone()) return
    if (localStorage.getItem(DISMISS_KEY)) return

    const onPrompt = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
      setVisible(true)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)

    // iOS never fires the event — show the manual hint after a short delay.
    let iosTimer: number | undefined
    if (isIos()) {
      iosTimer = window.setTimeout(() => {
        setIosHint(true)
        setVisible(true)
      }, 1500)
    }

    const onInstalled = () => {
      setVisible(false)
      localStorage.setItem(DISMISS_KEY, '1')
    }
    window.addEventListener('appinstalled', onInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
      if (iosTimer) clearTimeout(iosTimer)
    }
  }, [])

  function dismiss() {
    setVisible(false)
    localStorage.setItem(DISMISS_KEY, '1')
  }

  async function install() {
    if (!deferred) return
    await deferred.prompt()
    await deferred.userChoice
    setDeferred(null)
    setVisible(false)
    localStorage.setItem(DISMISS_KEY, '1')
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 30 }}
          className="fixed inset-x-0 bottom-0 z-[80] mx-auto max-w-[430px] px-4 pb-[max(14px,env(safe-area-inset-bottom))]"
        >
          <div className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3 shadow-float">
            <img src="/icon.svg" alt="" className="h-11 w-11 shrink-0 rounded-[10px]" />
            <div className="min-w-0 flex-1">
              <p className="text-subhead font-bold text-text">Install Hyperlocal</p>
              {iosHint ? (
                <p className="flex items-center gap-1 text-caption text-text-2">
                  Tap <Share size={13} className="inline" /> then “Add to Home Screen”
                </p>
              ) : (
                <p className="text-caption text-text-2">Faster access, full-screen, works offline.</p>
              )}
            </div>
            {!iosHint && (
              <Button size="sm" icon={<Download size={15} />} onClick={install}>
                Install
              </Button>
            )}
            <button onClick={dismiss} aria-label="Dismiss" className="text-text-3 hover:text-text">
              <X size={18} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
