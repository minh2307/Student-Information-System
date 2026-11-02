// PWA Service Worker - Disabled in development to prevent caching issues and white screens
self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .then(() => self.registration.unregister())
      .then(() => self.clients.claim())
  )
})

// Passthrough all requests directly to network
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request))
})
