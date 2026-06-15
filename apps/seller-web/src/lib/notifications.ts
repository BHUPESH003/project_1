/**
 * Browser notification + tab-title helpers for new-order alerts when the
 * seller has the tab backgrounded.
 */

const BASE_TITLE = 'Seller Console — Hyperlocal'
let titleFlashTimer: ReturnType<typeof setInterval> | null = null

/** Ask for notification permission (no-op if unsupported or already decided). */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof Notification === 'undefined') return 'denied'
  if (Notification.permission !== 'default') return Notification.permission
  try {
    return await Notification.requestPermission()
  } catch {
    return 'denied'
  }
}

/** Show a system notification for a new order (only useful when backgrounded). */
export function showOrderNotification(body: string) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
  try {
    const n = new Notification('🔔 New Order!', {
      body,
      icon: '/icon.svg',
      tag: 'new-order',
      renotify: true,
    } as NotificationOptions)
    n.onclick = () => {
      window.focus()
      n.close()
    }
  } catch {
    /* some browsers throw if constructed outside a SW — ignore */
  }
}

/** Flash the tab title until cleared. */
export function startTitleFlash(message = '🔔 New Order!') {
  stopTitleFlash()
  let on = false
  titleFlashTimer = setInterval(() => {
    document.title = on ? BASE_TITLE : message
    on = !on
  }, 1000)
}

export function stopTitleFlash() {
  if (titleFlashTimer) {
    clearInterval(titleFlashTimer)
    titleFlashTimer = null
  }
  document.title = BASE_TITLE
}

export function isTabHidden() {
  return typeof document !== 'undefined' && document.visibilityState === 'hidden'
}
