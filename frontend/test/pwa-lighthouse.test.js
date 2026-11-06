import { test, describe } from 'node:test'
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const frontendDir = path.resolve(__dirname, '..')

describe('Google Lighthouse PWA Standards & Checklist Test Suite', () => {

  describe('1. Web App Manifest Installability (Lighthouse Criterion 1)', () => {
    const manifestPath = path.join(frontendDir, 'public', 'manifest.json')
    let manifest

    test('Manifest file exists and is parsable JSON', () => {
      assert.ok(fs.existsSync(manifestPath), 'manifest.json must exist in public directory')
      manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
      assert.ok(manifest, 'manifest.json must be valid JSON object')
    })

    test('Manifest specifies valid name, short_name and description', () => {
      manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
      assert.ok(manifest.name && manifest.name.length > 0, 'Must have a valid name')
      assert.ok(manifest.short_name && manifest.short_name.length > 0, 'Must have a short_name')
      assert.ok(manifest.short_name.length <= 15, 'short_name should fit home screen label (<= 15 chars)')
      assert.ok(manifest.description && manifest.description.length > 0, 'Must have description')
    })

    test('Manifest specifies standalone or fullscreen display mode', () => {
      manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
      assert.ok(
        ['standalone', 'fullscreen', 'minimal-ui'].includes(manifest.display),
        `display must be standalone, fullscreen or minimal-ui (was: ${manifest.display})`
      )
    })

    test('Manifest defines start_url and scope anchored to root', () => {
      manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
      assert.strictEqual(manifest.start_url, '/')
      assert.strictEqual(manifest.scope, '/')
    })

    test('Manifest defines valid hex theme_color and background_color', () => {
      manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
      assert.match(manifest.theme_color, /^#[0-9a-fA-F]{6}$/, 'theme_color must be valid 6-char hex')
      assert.match(manifest.background_color, /^#[0-9a-fA-F]{6}$/, 'background_color must be valid 6-char hex')
    })

    test('Manifest includes required 192x192, 512x512 and maskable icons', () => {
      manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
      const iconSizes = manifest.icons.map(i => i.sizes)
      assert.ok(iconSizes.includes('192x192'), 'Must have 192x192 icon')
      assert.ok(iconSizes.includes('512x512'), 'Must have 512x512 icon')

      const hasMaskable = manifest.icons.some(i => i.purpose && i.purpose.includes('maskable'))
      assert.ok(hasMaskable, 'Must provide at least one maskable icon for adaptive Android launchers')
    })

    test('All manifest icons exist with non-zero file size on disk', () => {
      manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
      for (const icon of manifest.icons) {
        const diskPath = path.join(frontendDir, 'public', icon.src.replace(/^\//, ''))
        assert.ok(fs.existsSync(diskPath), `Icon file must exist: ${icon.src}`)
        const stat = fs.statSync(diskPath)
        assert.ok(stat.size > 100, `Icon file must not be placeholder/empty: ${icon.src} (${stat.size} bytes)`)
      }
    })
  })

  describe('2. Service Worker & Offline Capability (Lighthouse Criterion 2)', () => {
    const swPath = path.join(frontendDir, 'public', 'sw.js')
    const swContent = fs.readFileSync(swPath, 'utf8')

    test('sw.js registers install, activate, fetch, and message event listeners', () => {
      assert.match(swContent, /addEventListener\(['"]install['"]/, 'Must handle install event')
      assert.match(swContent, /addEventListener\(['"]activate['"]/, 'Must handle activate event')
      assert.match(swContent, /addEventListener\(['"]fetch['"]/, 'Must handle fetch event')
      assert.match(swContent, /addEventListener\(['"]message['"]/, 'Must handle message event')
    })

    test('sw.js precaches app shell assets for offline availability', () => {
      assert.match(swContent, /'\/index\.html'/, 'Must precache /index.html')
      assert.match(swContent, /'\/manifest\.json'/, 'Must precache /manifest.json')
      assert.match(swContent, /'\/images\/icon-192x192\.png'/, 'Must precache 192x192 icon')
      assert.match(swContent, /'\/images\/icon-512x512\.png'/, 'Must precache 512x512 icon')
    })

    test('sw.js employs Stale-While-Revalidate caching pattern for static assets', () => {
      assert.match(swContent, /isStaticAsset/, 'Must classify static assets')
      assert.match(swContent, /cache\.match/, 'Must check cache')
      assert.match(swContent, /cache\.put/, 'Must revalidate and update cache')
    })

    test('sw.js employs Network-First with app-shell fallback for HTML navigation', () => {
      assert.match(swContent, /mode === 'navigate'/, 'Must identify SPA navigation requests')
      assert.match(swContent, /caches\.match\('\/index\.html'\)/, 'Must fallback to offline cached app shell')
    })

    test('Security: sw.js bypasses cache for all authenticated /api/* endpoints', () => {
      assert.match(swContent, /isSensitiveOrApiRequest/, 'Must guard sensitive endpoints')
      assert.match(swContent, /startsWith\(['"]\/api\/['"]\)/, 'Must bypass /api/ routes')
    })
  })

  describe('3. Viewport & Mobile Display (Lighthouse Criterion 3)', () => {
    const htmlPath = path.join(frontendDir, 'index.html')
    const htmlContent = fs.readFileSync(htmlPath, 'utf8')

    test('index.html specifies viewport tag with width and initial-scale', () => {
      assert.match(
        htmlContent,
        /<meta name="viewport" content="[^"]*width=device-width[^"]*initial-scale=1\.0[^"]*"/,
        'Viewport must set device-width and initial-scale=1.0'
      )
    })

    test('index.html specifies theme-color matching manifest.json', () => {
      const manifest = JSON.parse(fs.readFileSync(path.join(frontendDir, 'public', 'manifest.json'), 'utf8'))
      assert.match(
        htmlContent,
        new RegExp(`<meta name="theme-color" content="${manifest.theme_color}"`),
        'theme-color in HTML must match manifest.json'
      )
    })

    test('index.html links web app manifest', () => {
      assert.match(htmlContent, /<link rel="manifest" href="\/manifest\.json"/, 'Must link manifest.json')
    })

    test('index.html specifies apple-touch-icon and apple mobile web app capabilities', () => {
      assert.match(htmlContent, /<link rel="apple-touch-icon"/, 'Must link apple-touch-icon')
      assert.match(htmlContent, /<meta name="apple-mobile-web-app-capable" content="yes"/, 'Must enable apple mobile web app')
    })

    test('index.html has title and SEO meta description', () => {
      assert.match(htmlContent, /<title>.+<\/title>/, 'Must have title tag')
      assert.match(htmlContent, /<meta name="description" content="[^"]+"/, 'Must have meta description')
    })
  })

  describe('4. Custom Install Prompt & Platform Adaptations (Lighthouse Criterion 4)', () => {
    const promptPath = path.join(frontendDir, 'src', 'components', 'PwaInstallPrompt.jsx')
    assert.ok(fs.existsSync(promptPath), 'PwaInstallPrompt.jsx must exist')
    const promptContent = fs.readFileSync(promptPath, 'utf8')

    test('Listens to beforeinstallprompt event to capture install banner', () => {
      assert.match(promptContent, /beforeinstallprompt/, 'Must listen to beforeinstallprompt event')
      assert.match(promptContent, /e\.preventDefault\(\)/, 'Must prevent default mini-infobar for custom UI')
    })

    test('Prompts user on action and handles outcome acceptance', () => {
      assert.match(promptContent, /deferredPrompt\.prompt\(\)/, 'Must trigger native prompt')
      assert.match(promptContent, /outcome === 'accepted'/, 'Must handle user choice')
    })

    test('Implements 3-day dismissal cooldown using localStorage', () => {
      assert.match(promptContent, /DISMISS_DURATION_MS/, 'Must define dismissal duration')
      assert.match(promptContent, /localStorage\.setItem/, 'Must persist dismissed state')
    })
  })
})
