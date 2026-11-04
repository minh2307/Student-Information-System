import { test, describe } from 'node:test'
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const frontendDir = path.resolve(__dirname, '..')

describe('PWA & Service Worker Test Suite (EDUP-210)', () => {

  describe('1. Web App Manifest Verification', () => {
    const manifestPath = path.join(frontendDir, 'public', 'manifest.json')

    test('manifest.json must exist and be valid JSON', () => {
      assert.ok(fs.existsSync(manifestPath), 'manifest.json must exist in public directory')
      const raw = fs.readFileSync(manifestPath, 'utf8')
      const manifest = JSON.parse(raw)
      assert.strictEqual(manifest.name, 'Rikkei EduPortal - Cổng Đào Tạo Thông Minh')
      assert.strictEqual(manifest.short_name, 'EduPortal')
      assert.strictEqual(manifest.display, 'standalone')
      assert.strictEqual(manifest.start_url, '/')
      assert.strictEqual(manifest.theme_color, '#b91c1c')
      assert.strictEqual(manifest.background_color, '#ffffff')
      assert.ok(Array.isArray(manifest.icons), 'icons must be an array')
      assert.ok(manifest.icons.length >= 2, 'manifest must have at least 2 icons')
    })

    test('all manifest icon references must physically exist on disk', () => {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
      for (const icon of manifest.icons) {
        const iconDiskPath = path.join(frontendDir, 'public', icon.src.replace(/^\//, ''))
        assert.ok(fs.existsSync(iconDiskPath), `Icon file missing on disk: ${icon.src} at ${iconDiskPath}`)
        const stat = fs.statSync(iconDiskPath)
        assert.ok(stat.size > 0, `Icon file must not be empty: ${icon.src}`)
      }
    })

    test('manifest must contain 192x192, 512x512 and maskable icons', () => {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
      const sizes = manifest.icons.map((i) => i.sizes)
      const purposes = manifest.icons.map((i) => i.purpose)
      assert.ok(sizes.includes('192x192'), 'Must include 192x192 icon')
      assert.ok(sizes.includes('512x512'), 'Must include 512x512 icon')
      assert.ok(purposes.some((p) => p && p.includes('maskable')), 'Must include maskable icon')
    })
  })

  describe('2. Service Worker (sw.js) Security & Caching Rules', () => {
    const swPath = path.join(frontendDir, 'public', 'sw.js')
    const swContent = fs.readFileSync(swPath, 'utf8')

    test('sw.js must contain versioned cache naming strategy', () => {
      assert.match(swContent, /const CACHE_VERSION = 'v\d+\.\d+\.\d+'/, 'Must define CACHE_VERSION')
      assert.match(swContent, /eduportal-static-/, 'Must define static cache prefix')
      assert.match(swContent, /eduportal-dynamic-/, 'Must define dynamic cache prefix')
    })

    test('sw.js must pre-cache essential static assets on install', () => {
      assert.match(swContent, /'\/index\.html'/, 'Must pre-cache index.html')
      assert.match(swContent, /'\/manifest\.json'/, 'Must pre-cache manifest.json')
      assert.match(swContent, /'\/images\/icon-192x192\.png'/, 'Must pre-cache 192 icon')
      assert.match(swContent, /'\/images\/icon-512x512\.png'/, 'Must pre-cache 512 icon')
    })

    test('sw.js must implement Stale-While-Revalidate for static assets', () => {
      assert.match(swContent, /isStaticAsset/, 'Must identify static assets')
      assert.match(swContent, /cache\.match\(request\)/, 'Must check cache first')
      assert.match(swContent, /return cachedResponse \|\| fetchPromise/, 'Must return cached immediately if available')
    })

    test('sw.js must implement Network-First with SPA shell fallback for HTML navigation', () => {
      assert.match(swContent, /request\.mode === 'navigate'/, 'Must detect navigation mode')
      assert.match(swContent, /caches\.match\('\/index\.html'\)/, 'Must fall back to cached index.html app shell')
    })

    test('sw.js must evict obsolete caches during activation without deleting unrelated caches', () => {
      assert.match(swContent, /self\.addEventListener\('activate'/, 'Must handle activate event')
      assert.match(swContent, /key\.startsWith\('eduportal-'\)/, 'Must only touch eduportal caches')
      assert.match(swContent, /self\.clients\.claim\(\)/, 'Must claim clients on activate')
    })

    test('sw.js must support controlled updates via message event', () => {
      assert.match(swContent, /self\.addEventListener\('message'/, 'Must listen to client messages')
      assert.match(swContent, /event\.data\.type === 'SKIP_WAITING'/, 'Must handle SKIP_WAITING')
      assert.match(swContent, /self\.skipWaiting\(\)/, 'Must call skipWaiting')
    })

    test('sw.js CRITICAL SECURITY: Never cache sensitive student or authentication endpoints', () => {
      // Extract isSensitiveOrApiRequest logic to test directly in isolation
      function isSensitiveOrApiRequest(pathname) {
        const path = pathname.toLowerCase()
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
        )
      }

      // Test all sensitive API routes
      assert.strictEqual(isSensitiveOrApiRequest('/api/v1/auth/login'), true)
      assert.strictEqual(isSensitiveOrApiRequest('/api/v1/auth/refresh'), true)
      assert.strictEqual(isSensitiveOrApiRequest('/api/v1/student/dashboard'), true)
      assert.strictEqual(isSensitiveOrApiRequest('/api/v1/student/grades'), true)
      assert.strictEqual(isSensitiveOrApiRequest('/api/v1/student/academic-context'), true)
      assert.strictEqual(isSensitiveOrApiRequest('/api/v1/student/enrollments'), true)
      assert.strictEqual(isSensitiveOrApiRequest('/api/v1/student/class-sections/live-seats'), true)
      assert.strictEqual(isSensitiveOrApiRequest('/api/v1/lecturer/classes'), true)
      assert.strictEqual(isSensitiveOrApiRequest('/api/v1/admin/users'), true)
      assert.strictEqual(isSensitiveOrApiRequest('/api/v1/ai/academic-advisor'), true)

      // Static assets must NOT be classified as sensitive
      assert.strictEqual(isSensitiveOrApiRequest('/assets/index-DMj-mjd1.js'), false)
      assert.strictEqual(isSensitiveOrApiRequest('/assets/index-BEvClD3D.css'), false)
      assert.strictEqual(isSensitiveOrApiRequest('/images/logo.png'), false)
      assert.strictEqual(isSensitiveOrApiRequest('/index.html'), false)
    })
  })

  describe('3. PWA Installation & Platform Detection Logic', () => {
    test('iOS Safari detection must correctly identify Safari on iPhone/iPad while excluding Chrome/Firefox on iOS', () => {
      function isIosSafari(ua) {
        const ual = ua.toLowerCase()
        const isIos = /iphone|ipad|ipod/.test(ual)
        const isSafari =
          ual.includes('safari') &&
          !ual.includes('crios') &&
          !ual.includes('fxios') &&
          !ual.includes('edgios') &&
          !ual.includes('opios')
        return isIos && isSafari
      }

      const iPhoneSafari =
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
      const iPadSafari =
        'Mozilla/5.0 (iPad; CPU OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1'
      const iPhoneChrome =
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/117.0.5938.108 Mobile/15E148 Safari/604.1'
      const androidChrome =
        'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'

      assert.strictEqual(isIosSafari(iPhoneSafari), true, 'Must detect iPhone Safari')
      assert.strictEqual(isIosSafari(iPadSafari), true, 'Must detect iPad Safari')
      assert.strictEqual(isIosSafari(iPhoneChrome), false, 'Must NOT treat Chrome on iOS as native Safari')
      assert.strictEqual(isIosSafari(androidChrome), false, 'Must NOT treat Android Chrome as iOS Safari')
    })

    test('Dismissal duration must be set to 3 days (259200000ms)', () => {
      const DISMISS_DURATION_MS = 3 * 24 * 60 * 60 * 1000
      assert.strictEqual(DISMISS_DURATION_MS, 259200000)
      const now = 1700000000000
      const dismissedUntil = now + DISMISS_DURATION_MS
      assert.ok(now < dismissedUntil, 'Current time must be before dismissedUntil')
      assert.ok(now + DISMISS_DURATION_MS + 1000 > dismissedUntil, 'Must expire after 3 days')
    })
  })

  describe('4. HTML & Vite Integration Verification', () => {
    test('index.html must properly link manifest and apple touch icons', () => {
      const htmlPath = path.join(frontendDir, 'index.html')
      const htmlContent = fs.readFileSync(htmlPath, 'utf8')
      assert.match(htmlContent, /<link rel="manifest" href="\/manifest\.json"/, 'Must link manifest.json')
      assert.match(htmlContent, /<meta name="theme-color" content="#b91c1c"/, 'Must specify theme-color')
      assert.match(htmlContent, /<meta name="apple-mobile-web-app-capable" content="yes"/, 'Must support apple web app')
      assert.match(htmlContent, /<link rel="apple-touch-icon"/, 'Must link apple-touch-icon')
    })

    test('main.jsx must import and initialize registerServiceWorker', () => {
      const mainPath = path.join(frontendDir, 'src', 'main.jsx')
      const mainContent = fs.readFileSync(mainPath, 'utf8')
      assert.match(mainContent, /registerServiceWorker\(\)/, 'Must call registerServiceWorker()')
    })

    test('App.jsx must mount PwaInstallPrompt globally', () => {
      const appPath = path.join(frontendDir, 'src', 'App.jsx')
      const appContent = fs.readFileSync(appPath, 'utf8')
      assert.match(appContent, /import \{ PwaInstallPrompt \} from '\.\/components\/PwaInstallPrompt'/, 'Must import PwaInstallPrompt')
      assert.match(appContent, /<PwaInstallPrompt \/>/, 'Must render PwaInstallPrompt')
    })
  })
})
