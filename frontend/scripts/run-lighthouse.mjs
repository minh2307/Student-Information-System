import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distDir = path.resolve(__dirname, '..', 'dist')
const publicDir = path.resolve(__dirname, '..', 'public')

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8'
}

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0]
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html'

  let filePath = path.join(distDir, reqPath)
  if (!fs.existsSync(filePath)) {
    // Check in public dir
    filePath = path.join(publicDir, reqPath)
  }
  if (!fs.existsSync(filePath)) {
    // SPA Fallback for client routing
    filePath = path.join(distDir, 'index.html')
  }

  const ext = path.extname(filePath).toLowerCase()
  const contentType = MIME_TYPES[ext] || 'application/octet-stream'

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' })
      res.end('Not Found')
      return
    }
    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache'
    })
    res.end(data)
  })
})

const PORT = 4173

server.listen(PORT, '127.0.0.1', async () => {
  console.log(`[HTTP Server] Serving frontend/dist on http://127.0.0.1:${PORT}`)
  console.log(`[Lighthouse] Spawning Google Lighthouse audit...`)

  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  process.env.CHROME_PATH = chromePath

  const reportDir = path.resolve(__dirname, '..', 'lighthouse-reports')
  if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true })
  const reportPrefix = path.join(reportDir, 'pwa-audit')

  // Run Lighthouse CLI
  const lhArgs = [
    '--yes',
    'lighthouse@13.6.0',
    `http://127.0.0.1:${PORT}`,
    '--chrome-flags=--headless=new --no-sandbox --disable-gpu --disable-dev-shm-usage',
    '--output=json,html',
    `--output-path=${reportPrefix}`,
    '--view=false',
    '--quiet'
  ]

  const isWindows = process.platform === 'win32'
  const cmd = isWindows ? 'npx.cmd' : 'npx'

  const lhProcess = spawn(cmd, lhArgs, {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, CHROME_PATH: chromePath }
  })

  lhProcess.on('close', (code) => {
    server.close()
    console.log(`[Lighthouse] Process finished with exit code: ${code}`)
    const jsonPath = `${reportPrefix}.report.json`
    if (fs.existsSync(jsonPath)) {
      try {
        const raw = fs.readFileSync(jsonPath, 'utf8')
        const data = JSON.parse(raw)
        console.log('\n================ LIGHTHOUSE AUDIT REPORT ================')
        console.log(`URL Tested:          ${data.finalDisplayedUrl || data.finalUrl}`)
        console.log(`Lighthouse Version:  ${data.lighthouseVersion}`)
        console.log(`User Agent:          ${data.userAgent}`)
        console.log('\n--- CATEGORY SCORES ---')
        for (const [key, cat] of Object.entries(data.categories || {})) {
          const score = cat.score !== null ? Math.round(cat.score * 100) : 'N/A'
          const star = score === 100 ? ' [EXCELLENT 100/100]' : (score >= 90 ? ' [GREAT]' : '')
          console.log(`  * ${cat.title.padEnd(20)}: ${score}${star}`)
        }

        // PWA Verification Checklist
        const manifestRaw = fs.readFileSync(path.join(publicDir, 'manifest.json'), 'utf8')
        const manifest = JSON.parse(manifestRaw)
        const swRaw = fs.readFileSync(path.join(publicDir, 'sw.js'), 'utf8')
        const htmlRaw = fs.readFileSync(path.join(distDir, 'index.html'), 'utf8')

        console.log('\n--- PWA STANDARD SPECIFICATION AUDITS ---')
        const checks = [
          {
            name: 'Web App Manifest valid JSON & registered in HTML',
            pass: fs.existsSync(path.join(publicDir, 'manifest.json')) && htmlRaw.includes('rel="manifest"')
          },
          {
            name: 'Display mode standalone / fullscreen',
            pass: manifest.display === 'standalone'
          },
          {
            name: 'Start URL & Scope anchored to root (/)',
            pass: manifest.start_url === '/' && manifest.scope === '/'
          },
          {
            name: 'Theme color (#b91c1c) defined in Manifest & HTML meta tag',
            pass: manifest.theme_color === '#b91c1c' && htmlRaw.includes('content="#b91c1c"')
          },
          {
            name: 'Responsive viewport meta tag with initial-scale=1.0',
            pass: htmlRaw.includes('width=device-width') && htmlRaw.includes('initial-scale=1.0')
          },
          {
            name: 'App icons present (192x192, 512x512, maskable 512x512)',
            pass: manifest.icons.some(i => i.sizes === '192x192') &&
                  manifest.icons.some(i => i.sizes === '512x512') &&
                  manifest.icons.some(i => i.purpose?.includes('maskable'))
          },
          {
            name: 'Apple Touch Icons & mobile web app capability tags',
            pass: htmlRaw.includes('rel="apple-touch-icon"') && htmlRaw.includes('apple-mobile-web-app-capable')
          },
          {
            name: 'Service Worker (sw.js) Stale-While-Revalidate & App-Shell precache',
            pass: swRaw.includes('isStaticAsset') && swRaw.includes('/index.html') && swRaw.includes('caches.match')
          },
          {
            name: 'Security Isolation: Never cache /api/* and sensitive auth routes',
            pass: swRaw.includes('isSensitiveOrApiRequest') && swRaw.includes('/api/')
          },
          {
            name: 'SEO Meta Description & valid robots.txt',
            pass: htmlRaw.includes('name="description"') && fs.existsSync(path.join(publicDir, 'robots.txt'))
          }
        ]

        let passCount = 0
        for (const chk of checks) {
          if (chk.pass) passCount++
          const mark = chk.pass ? '[✓ PASS]' : '[✗ FAIL]'
          console.log(`  ${mark} ${chk.name}`)
        }
        console.log(`\n  >> Total PWA Compliance: ${passCount}/${checks.length} (${Math.round(passCount / checks.length * 100)}%)`)
        console.log('=========================================================\n')
      } catch (e) {
        console.error('Error parsing report json:', e)
      }
    }
    process.exit(code)
  })
})
