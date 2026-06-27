import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { apiPost } from '@/api/client'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

function urlBase64ToArrayBuffer(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const buf = new ArrayBuffer(raw.length)
  const arr = new Uint8Array(buf)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return buf
}

// Whether the browser can show notifications at all
const notifSupported = typeof window !== 'undefined' && 'Notification' in window

// Whether the browser can receive server-sent push (needs SW + PushManager + VAPID key)
const pushSupported =
  notifSupported &&
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  !!VAPID_PUBLIC_KEY

// Registers the browser's PushSubscription with our backend.
// Only called after permission is already granted.
async function subscribeAndRegister(): Promise<void> {
  if (!pushSupported || !VAPID_PUBLIC_KEY) return
  const registration = await navigator.serviceWorker.ready
  const existing = await registration.pushManager.getSubscription()
  const sub =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToArrayBuffer(VAPID_PUBLIC_KEY),
    }))
  const { endpoint, keys } = sub.toJSON() as {
    endpoint: string
    keys: { p256dh: string; auth: string }
  }
  await apiPost('/users/me/push-subscription', {
    endpoint,
    p256dhKey: keys.p256dh,
    authKey: keys.auth,
  })
}

/**
 * Returns:
 *  - `permissionState` — 'default' | 'granted' | 'denied' | 'unsupported'
 *  - `requestAndSubscribe` — must be called from a user-click handler so the
 *    browser accepts the permission prompt; always shows the OS dialog regardless
 *    of whether the VAPID key is configured
 */
export function useWebPush() {
  const isAuthed = useAuthStore((s) => s.isAuthenticated)
  const autoSubscribed = useRef(false)

  const [permissionState, setPermissionState] = useState<
    NotificationPermission | 'unsupported'
  >(() => (notifSupported ? Notification.permission : 'unsupported'))

  // Re-register silently on login when the user already granted permission before
  useEffect(() => {
    if (!isAuthed || autoSubscribed.current) return
    if (Notification.permission !== 'granted') return
    autoSubscribed.current = true
    subscribeAndRegister().catch(() => {})
  }, [isAuthed])

  /**
   * Trigger this from a button onClick.
   * 1. Shows the native OS permission dialog (always, even without VAPID key).
   * 2. If granted and VAPID is configured, registers the push subscription.
   */
  const requestAndSubscribe = useCallback(async () => {
    if (!notifSupported) return
    const result = await Notification.requestPermission()
    setPermissionState(result)
    if (result === 'granted') {
      subscribeAndRegister().catch(() => {})
    }
  }, [])

  return { permissionState, requestAndSubscribe }
}
