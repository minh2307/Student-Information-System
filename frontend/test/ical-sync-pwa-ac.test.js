import { test, describe } from 'node:test'
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const frontendDir = path.resolve(__dirname, '..')

describe('AC Verification Suite: EDUP-209 (iCal & WebCal) & EDUP-210 (PWA & Offline Timetable)', () => {
  const timetablePath = path.join(frontendDir, 'src', 'pages', 'StudentTimetable.jsx')
  const gradesPath = path.join(frontendDir, 'src', 'pages', 'StudentGrades.jsx')
  const pwaPromptPath = path.join(frontendDir, 'src', 'components', 'PwaInstallPrompt.jsx')
  const swPath = path.join(frontendDir, 'public', 'sw.js')
  const manifestPath = path.join(frontendDir, 'public', 'manifest.json')

  describe('[EDUP-209] iCal Export & WebCal Live Subscription Integration', () => {
    test('StudentTimetable.jsx provides .ics file download trigger', () => {
      assert.ok(fs.existsSync(timetablePath), 'StudentTimetable.jsx must exist')
      const content = fs.readFileSync(timetablePath, 'utf8')

      // 1. Download .ics function and endpoint
      assert.ok(content.includes('/api/v1/student/calendar/export.ics'), 'Must link to /export.ics endpoint')
      assert.ok(content.includes('handleDownloadIcs'), 'Must provide handleDownloadIcs handler')
      assert.ok(content.includes('Tải về .ics') || content.includes('Tải file lịch (.ics)'), 'Must render button to download .ics')
    })

    test('StudentTimetable.jsx provides WebCal subscription modal & Apple Calendar URL', () => {
      const content = fs.readFileSync(timetablePath, 'utf8')

      // 2. Subscription info API and WebCal link
      assert.ok(content.includes('/student/calendar/subscription-info'), 'Must fetch subscription info from API')
      assert.ok(content.includes('syncInfo?.subscriptionUrl'), 'Must display subscriptionUrl')
      assert.ok(content.includes('webcalUrl'), 'Must support webcalUrl protocol for iOS')
      assert.ok(content.includes('handleCopyLink'), 'Must provide copy link functionality')
      assert.ok(content.includes('Apple Calendar'), 'Must include instructions or action for Apple Calendar on iPhone')
      assert.ok(content.includes('Google Calendar'), 'Must include instructions for Google Calendar')
    })
  })

  describe('[EDUP-210] PWA Installation, Standalone Mode & Offline Timetable Access', () => {
    test('Manifest defines standalone display mode and valid start_url', () => {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
      assert.strictEqual(manifest.display, 'standalone', 'App must launch in standalone mode without browser URL bar')
      assert.strictEqual(manifest.start_url, '/', 'PWA start_url must be root')
    })

    test('PwaInstallPrompt.jsx provides iOS Safari Add-to-Home-Screen instructions', () => {
      const content = fs.readFileSync(pwaPromptPath, 'utf8')
      assert.ok(content.includes('Thêm vào MH chính') || content.includes('Add to Home Screen') || content.includes('Cài đặt EduPortal trên iOS'), 'Must guide user to Add to Home Screen on iOS')
      assert.ok(content.includes('detectIosSafari') || content.includes('isIosDevice'), 'Must detect iOS Safari environment')
      assert.ok(content.includes('isOffline'), 'Must track network offline state')
      assert.ok(content.includes('Ngoại tuyến (Offline)'), 'Must display offline notification banner')
    })

    test('StudentTimetable.jsx and StudentGrades.jsx implement offline local caching', () => {
      const timetableContent = fs.readFileSync(timetablePath, 'utf8')
      const gradesContent = fs.readFileSync(gradesPath, 'utf8')

      // Timetable offline cache
      assert.ok(timetableContent.includes('eduportal_cached_timetable_'), 'Must cache timetable to localStorage')
      assert.ok(timetableContent.includes('eduportal_cached_semesters'), 'Must cache semester list to localStorage')
      assert.ok(timetableContent.includes('isOfflineData'), 'Must identify offline cached data')

      // Grades offline cache
      assert.ok(gradesContent.includes('eduportal_cached_grades'), 'Must cache grades to localStorage for offline viewing')
    })
  })
})
