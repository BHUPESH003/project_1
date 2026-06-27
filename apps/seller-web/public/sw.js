/* Seller Console PWA service worker — caching + Web Push.
   - API requests (/api/*) and non-GET: always network, never cached.
   - Navigations: network-first, fall back to cached shell when offline.
   - Same-origin static assets: stale-while-revalidate.
   - Push events: show a notification; for NEW_ORDER, also wake the foreground
     tab via BroadcastChannel so it can play the alert chime. */

const CACHE = 'seller-v1'
const SHELL = ['/', '/index.html']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api')) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put('/index.html', copy))
          return res
        })
        .catch(() => caches.match('/index.html').then((r) => r || caches.match('/'))),
    )
    return
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone()
            caches.open(CACHE).then((c) => c.put(request, copy))
          }
          return res
        })
        .catch(() => cached)
      return cached || network
    }),
  )
})

// ─── Push notifications ─────────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  let data = { title: 'New notification', body: '', data: {} }
  try { data = event.data ? event.data.json() : data } catch { data.body = event.data ? event.data.text() : '' }

  const isNewOrder = data.data?.type === 'NEW_ORDER'

  event.waitUntil((async () => {
    // Always show the notification so the OS makes a sound and it appears in the
    // notification tray — this is also required before openWindow() can be called.
    await self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon.svg',
      badge: '/icon.svg',
      tag: isNewOrder ? 'new-order' : 'seller-notif',
      renotify: isNewOrder,
      requireInteraction: isNewOrder,
      data: data.data ?? {},
    })

    if (isNewOrder) {
      // Wake any open seller tab for the in-app audio chime.
      const ch = new BroadcastChannel('seller-push')
      ch.postMessage({ type: 'NEW_ORDER', payload: data.data })
      ch.close()

      // Bring the seller app to the front so the seller sees the new order immediately.
      const windowClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      if (windowClients.length > 0) {
        // App is already open — focus it.
        await windowClients[0].focus()
      } else {
        // App is closed — open a new tab (allowed because we showed a notification above).
        if (self.clients.openWindow) await self.clients.openWindow('/')
      }
    }
  })())
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url && 'focus' in client) return client.focus()
      }
      if (clients.openWindow) return clients.openWindow('/')
    }),
  )
})
