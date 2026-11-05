/**
 * Rikkei EduPortal - Progressive Web App Service Worker
 * Version: v1.0.0
 * 
 * Objectives:
 * 1. Stale-While-Revalidate for eligible static assets (JS, CSS, images, fonts).
 * 2. Network-First with App Shell cache fallback for HTML navigation (SPA routes).
 * 3. Strict security: NEVER cache authenticated/sensitive API requests (/api/*, JWT, student records).
 * 4. Safe lifecycle management (versioned cache, clean activation, controlled skipWaiting).
 */

const CACHE_VERSION = 'v1.0.0';
const STATIC_CACHE = `eduportal-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `eduportal-dynamic-${CACHE_VERSION}`;
const ALL_CACHES = [STATIC_CACHE, DYNAMIC_CACHE];

// Essential static resources pre-cached upon Service Worker installation
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/images/logo.png',
  '/images/logo.svg',
  '/images/icon-192x192.png',
  '/images/icon-512x512.png',
  '/images/icon-maskable-512x512.png',
  '/images/stamp-seal.svg'
];

// Maximum dynamic cache entries to prevent unbounded storage growth
const MAX_DYNAMIC_ITEMS = 60;

/**
 * Clean up old entries from dynamic cache when threshold is exceeded (FIFO)
 */
async function limitCacheSize(cacheName, maxItems) {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length > maxItems) {
      await cache.delete(keys[0]);
      await limitCacheSize(cacheName, maxItems);
    }
  } catch (err) {
    // Silently ignore cache eviction errors
  }
}

/**
 * Verify whether a URL is an API or sensitive endpoint that MUST NEVER be cached
 */
function isSensitiveOrApiRequest(url) {
  const path = url.pathname.toLowerCase();
  return (
    path.startsWith('/api/') ||
    path.startsWith('/api/v1/') ||
    path.includes('/auth/') ||
    path.includes('/student/') ||
    path.includes('/lecturer/') ||
    path.includes('/admin/') ||
    path.includes('/ai/') ||
    path.includes('/profile/') ||
    path.includes('/tuition/') ||
    path.includes('/calendar/') ||
    path.includes('/live-seats') ||
    path.includes('/attendance/') ||
    path.includes('/grades') ||
    path.includes('/enrollments')
  );
}

/**
 * Verify whether a request is an eligible static asset for Stale-While-Revalidate
 */
function isStaticAsset(url) {
  const path = url.pathname.toLowerCase();
  return (
    path.startsWith('/assets/') ||
    path.startsWith('/images/') ||
    path.endsWith('.js') ||
    path.endsWith('.css') ||
    path.endsWith('.png') ||
    path.endsWith('.jpg') ||
    path.endsWith('.jpeg') ||
    path.endsWith('.svg') ||
    path.endsWith('.webp') ||
    path.endsWith('.ico') ||
    path.endsWith('.woff') ||
    path.endsWith('.woff2') ||
    path.endsWith('.ttf') ||
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com'
  );
}

/* ==========================================================================
   1. INSTALL LIFECYCLE
   ========================================================================== */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(async (cache) => {
      // Pre-cache essential resources with individual error resilience
      const cachePromises = PRECACHE_ASSETS.map(async (url) => {
        try {
          const response = await fetch(url, { cache: 'no-cache' });
          if (response && response.status === 200) {
            await cache.put(url, response);
          }
        } catch (error) {
          // Non-fatal: asset can be fetched on demand later
          console.debug('[PWA-SW] Pre-cache skipped for optional asset:', url);
        }
      });
      await Promise.allSettled(cachePromises);
    })
  );
  // Do NOT blindly force self.skipWaiting() here to avoid unexpected reloads for active users
});

/* ==========================================================================
   2. ACTIVATE LIFECYCLE - Clean up obsolete application caches
   ========================================================================== */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key.startsWith('eduportal-') && !ALL_CACHES.includes(key))
          .map((obsoleteKey) => {
            console.log('[PWA-SW] Evicting obsolete cache:', obsoleteKey);
            return caches.delete(obsoleteKey);
          })
      );
    }).then(() => self.clients.claim())
  );
});

/* ==========================================================================
   3. CLIENT MESSAGE EVENT - Controlled updates
   ========================================================================== */
self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'SKIP_WAITING') {
    console.log('[PWA-SW] Received SKIP_WAITING directive from client.');
    self.skipWaiting();
  } else if (event.data.type === 'CLIENTS_CLAIM') {
    self.clients.claim();
  } else if (event.data.type === 'GET_VERSION' && event.ports && event.ports[0]) {
    event.ports[0].postMessage({ version: CACHE_VERSION });
  }
});

/* ==========================================================================
   4. FETCH EVENT - Intelligent Caching Strategies
   ========================================================================== */
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Rule 1: Only intercept GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Rule 2: Only handle HTTP/HTTPS schemes (ignore chrome-extension, blob, etc.)
  if (!request.url.startsWith('http://') && !request.url.startsWith('https://')) {
    return;
  }

  const url = new URL(request.url);

  // Rule 2.1: Ignore third-party cross-origin requests (e.g. Cloudflare Insights, analytics) unless whitelisted
  const isSameOrigin = url.origin === self.location.origin;
  const isAllowedExternal = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (!isSameOrigin && !isAllowedExternal) {
    return;
  }

  // Rule 3: STRICT SECURITY - API & SENSITIVE DATA PASSTHROUGH
  // Never intercept or cache student records, auth, or transactional API endpoints
  if (isSensitiveOrApiRequest(url)) {
    event.respondWith(
      fetch(request).catch(() => {
        // Return clear offline JSON payload for downstream API calls when disconnected
        return new Response(
          JSON.stringify({
            status: 503,
            success: false,
            message: 'Thiết bị đang ở chế độ Ngoại tuyến (Offline). Tính năng này yêu cầu kết nối mạng.',
            offline: true
          }),
          {
            status: 503,
            statusText: 'Service Unavailable (Offline)',
            headers: {
              'Content-Type': 'application/json; charset=UTF-8',
              'X-EduPortal-Offline': 'true'
            }
          }
        );
      })
    );
    return;
  }

  // Rule 4: HTML NAVIGATION - Network-First with SPA App Shell Fallback
  if (request.mode === 'navigate' || (request.headers.get('accept') && request.headers.get('accept').includes('text/html'))) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put('/index.html', clone));
          }
          return networkResponse;
        })
        .catch(async () => {
          // Offline fallback: Serve cached SPA Application Shell (index.html)
          const cachedShell = (await caches.match('/index.html')) || (await caches.match('/'));
          if (cachedShell) {
            return cachedShell;
          }
          // Minimal offline emergency fallback
          return new Response(
            `<!DOCTYPE html>
            <html lang="vi">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>EduPortal - Ngoại tuyến</title>
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f8fafc; color: #1e293b; padding: 20px; box-sizing: border-box; text-align: center; }
                .card { background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 32px 24px; max-width: 400px; width: 100%; box-shadow: 0 10px 25px rgba(0,0,0,0.05); }
                .icon { width: 56px; height: 56px; background: #fee2e2; color: #dc2626; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; font-size: 28px; }
                h1 { font-size: 18px; margin: 0 0 8px; font-weight: 700; }
                p { font-size: 13px; color: #64748b; margin: 0 0 20px; line-height: 1.5; }
                button { background: #b91c1c; color: white; border: none; border-radius: 10px; padding: 10px 20px; font-size: 13px; font-weight: 600; cursor: pointer; transition: background 0.2s; }
                button:hover { background: #991b1b; }
              </style>
            </head>
            <body>
              <div class="card">
                <div class="icon">⚡</div>
                <h1>Bạn đang ở chế độ Ngoại tuyến</h1>
                <p>Không có kết nối mạng Internet. Vui lòng kiểm tra lại kết nối Wifi hoặc 4G/5G và tải lại trang.</p>
                <button onclick="window.location.reload()">Thử kết nối lại</button>
              </div>
            </body>
            </html>`,
            {
              headers: { 'Content-Type': 'text/html; charset=utf-8' },
              status: 200
            }
          );
        })
    );
    return;
  }

  // Rule 5: STATIC ASSETS - Stale-While-Revalidate
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cachedResponse = await cache.match(request);

        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              if (networkResponse.type === 'basic' || networkResponse.type === 'cors') {
                cache.put(request, networkResponse.clone());
              }
            }
            return networkResponse;
          })
          .catch(() => {
            // Network failure: cached response will serve as fallback
            return cachedResponse || new Response('Asset not found or offline', {
              status: 404,
              statusText: 'Not Found',
              headers: { 'Content-Type': 'text/plain' }
            });
          });

        // Return immediately from cache if available, else await network response
        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // Rule 6: DYNAMIC RUNTIME RESOURCES - Network-First with Dynamic Cache Fallback
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        const hasAuthHeader = request.headers.has('authorization');
        const cacheControl = (networkResponse && networkResponse.headers.get('cache-control')) || '';
        const isNoStoreOrPrivate = cacheControl.includes('no-store') || cacheControl.includes('private');

        if (
          networkResponse &&
          networkResponse.status === 200 &&
          networkResponse.type === 'basic' &&
          !hasAuthHeader &&
          !isNoStoreOrPrivate
        ) {
          const clone = networkResponse.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, clone);
            limitCacheSize(DYNAMIC_CACHE, MAX_DYNAMIC_ITEMS);
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        return new Response('Resource unavailable offline', {
          status: 503,
          statusText: 'Service Unavailable'
        });
      })
  );
});
