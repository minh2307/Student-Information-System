const CACHE_NAME = 'rikkei-eduportal-v1'
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/images/logo.png',
  '/images/logo.svg'
]

// 1. Install Event: Cache essential app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[PWA Service Worker] Pre-caching App Shell')
      return cache.addAll(STATIC_ASSETS)
    }).then(() => self.skipWaiting())
  )
})

// 2. Activate Event: Clean up old cache versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[PWA Service Worker] Deleting old cache:', key)
            return caches.delete(key)
          }
        })
      )
    }).then(() => self.clients.claim())
  )
})

// 3. Fetch Event: Network-first for API, Cache-first / Stale-While-Revalidate for static assets
self.addEventListener('fetch', (event) => {
  const request = event.request

  // Only handle GET requests
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  // API Requests: Network first, fallback to cached data if offline
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // If valid response, clone and cache for offline reading
          if (response && response.status === 200) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          }
          return response
        })
        .catch(() => {
          // Offline fallback: try reading from cache
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse
            }
            return new Response(
              JSON.stringify({
                status: 503,
                message: 'Bạn đang ngoại tuyến. Dữ liệu chưa kịp đồng bộ vào bộ nhớ đệm.'
              }),
              {
                headers: { 'Content-Type': 'application/json' },
                status: 503
              }
            )
          })
        })
    )
    return
  }

  // Static Assets (HTML, CSS, JS, Images, Fonts): Stale-While-Revalidate
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const clone = networkResponse.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          }
          return networkResponse
        })
        .catch(() => cachedResponse)

      return cachedResponse || fetchPromise
    })
  )
})
