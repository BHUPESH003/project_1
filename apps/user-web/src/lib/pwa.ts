/** Register the service worker (production only — avoids dev caching headaches). */
export function registerSW() {
  if (!('serviceWorker' in navigator)) return
  if (!import.meta.env.PROD) return
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* registration failure is non-fatal */
    })
  })
}

/** The `beforeinstallprompt` event (not in the standard TS lib). */
export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/** Heuristics for the install banner. */
export function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

export function isIos() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent)
}
