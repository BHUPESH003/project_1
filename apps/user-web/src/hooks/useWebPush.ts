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

const isSupported =
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  'Notification' in window

async function subscribeAndRegister(): Promise<boolean> {
  if (!isSupported || !VAPID_PUBLIC_KEY) return false
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
  return true
}

/**
 * Returns:
 *  - `permissionState` — current Notification.permission or 'unsupported'
 *  - `requestAndSubscribe` — call this from a user-gesture handler (button click)
 *    to show the browser permission dialog then subscribe
 */
export function useWebPush() {
  const isAuthed = useAuthStore((s) => s.isAuthenticated)
  const autoSubscribed = useRef(false)

  const [permissionState, setPermissionState] = useState<
    NotificationPermission | 'unsupported'
  >(() => {
    if (!isSupported) return 'unsupported'
    return Notification.permission
  })

  // Auto-subscribe silently when permission was already granted in a previous session
  useEffect(() => {
    if (!isAuthed || autoSubscribed.current) return
    if (!isSupported || !VAPID_PUBLIC_KEY) return
    if (Notification.permission !== 'granted') return

    autoSubscribed.current = true
    subscribeAndRegister().catch(() => {})
  }, [isAuthed])

  // Call from a button click — shows the OS permission dialog, then subscribes
  const requestAndSubscribe = useCallback(async () => {
    if (!isSupported || !VAPID_PUBLIC_KEY) return
    const result = await Notification.requestPermission()
    setPermissionState(result)
    if (result === 'granted') {
      await subscribeAndRegister().catch(() => {})
    }
  }, [])

  return { permissionState, requestAndSubscribe }
}
