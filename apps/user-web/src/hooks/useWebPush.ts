import { useEffect, useRef } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { apiPost } from '@/api/client'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string

function urlBase64ToArrayBuffer(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const buf = new ArrayBuffer(raw.length)
  const arr = new Uint8Array(buf)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return buf
}

/**
 * Subscribes the current browser to web push (VAPID) once the user is
 * authenticated and the browser supports service workers + Push API.
 * Registers the subscription with the backend so the server can deliver
 * notifications without Firebase.
 */
export function useWebPush() {
  const isAuthed = useAuthStore((s) => s.isAuthenticated)
  const registered = useRef(false)

  useEffect(() => {
    if (!isAuthed || registered.current) return
    if (!VAPID_PUBLIC_KEY) return
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return

    let cancelled = false

    async function subscribe() {
      try {
        const registration = await navigator.serviceWorker.ready

        // Ask for notification permission (no-op if already granted)
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') return

        const existing = await registration.pushManager.getSubscription()
        const subscription =
          existing ??
          (await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToArrayBuffer(VAPID_PUBLIC_KEY),
          }))

        if (cancelled) return

        const { endpoint, keys } = subscription.toJSON() as {
          endpoint: string
          keys: { p256dh: string; auth: string }
        }

        await apiPost('/users/me/push-subscription', {
          endpoint,
          p256dhKey: keys.p256dh,
          authKey: keys.auth,
        })

        registered.current = true
      } catch {
        // Non-critical — push not available in this browser or context
      }
    }

    void subscribe()
    return () => {
      cancelled = true
    }
  }, [isAuthed])
}
