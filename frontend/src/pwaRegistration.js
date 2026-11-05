/**
 * Rikkei EduPortal - Service Worker Registration & PWA Lifecycle Manager
 */

let refreshing = false

export function isStandalone() {
  if (typeof window === 'undefined') return false
  let isInstalled = false
  try {
    isInstalled = localStorage.getItem('eduportal_pwa_installed') === 'true'
  } catch {}
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true ||
    document.referrer.includes('android-app://') ||
    isInstalled
  )
}

export function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return
  }

  // Prevent service worker from caching during local development unless explicitly enabled
  const isEnabled = import.meta.env.PROD || import.meta.env.VITE_ENABLE_SW === 'true'

  if (!isEnabled) {
    // Unregister any leftover workers in dev mode to avoid white screens
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const reg of registrations) {
        reg.unregister()
      }
    }).catch(() => {})
    return
  }

  // Reload page when new service worker takes control (after SKIP_WAITING)
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return
    refreshing = true
    console.log('[PWA] New controller active. Reloading application...')
    window.location.reload()
  })

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        console.log('[PWA] Service Worker registered with scope:', registration.scope)

        // Check if there is already an updated worker waiting
        if (registration.waiting) {
          dispatchUpdateEvent(registration)
        }

        registration.addEventListener('updatefound', () => {
          const installingWorker = registration.installing
          if (!installingWorker) return

          installingWorker.addEventListener('statechange', () => {
            if (installingWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                // New update available
                console.log('[PWA] New content is available; please refresh.')
                dispatchUpdateEvent(registration)
              } else {
                // Content cached for offline use
                console.log('[PWA] Content is cached for offline use.')
                window.dispatchEvent(new CustomEvent('eduportal:sw-cached'))
              }
            }
          })
        })
      })
      .catch((error) => {
        console.warn('[PWA] Service Worker registration failed:', error)
      })
  })
}

function dispatchUpdateEvent(registration) {
  window.dispatchEvent(
    new CustomEvent('eduportal:sw-updated', {
      detail: {
        registration,
        skipWaiting: () => {
          if (registration.waiting) {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' })
          }
        },
      },
    })
  )
}

export function unregisterServiceWorker() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => registration.unregister())
      .catch((err) => console.warn('[PWA] Unregister failed:', err))
  }
}
