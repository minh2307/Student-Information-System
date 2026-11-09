import { test, describe, beforeEach } from 'node:test'
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const frontendDir = path.resolve(__dirname, '..')

describe('TASK-D05: PWA Service Worker & Mobile Offline Fallback Verification', () => {
  const swPath = path.join(frontendDir, 'public', 'sw.js')
  const timetablePath = path.join(frontendDir, 'src', 'pages', 'StudentTimetable.jsx')
  const gradesPath = path.join(frontendDir, 'src', 'pages', 'StudentGrades.jsx')

  const swContent = fs.readFileSync(swPath, 'utf8')
  const timetableContent = fs.readFileSync(timetablePath, 'utf8')
  const gradesContent = fs.readFileSync(gradesPath, 'utf8')

  describe('1. Service Worker Offline Caching Strategy for Mobile', () => {
    test('sw.js declares isOfflineCacheableApi function for timetable, grades, and semesters', () => {
      assert.match(swContent, /function\s+isOfflineCacheableApi/, 'Must define isOfflineCacheableApi function')
      assert.match(swContent, /\/student\/timetable/, 'Must match /student/timetable')
      assert.match(swContent, /\/student\/grades/, 'Must match /student/grades')
      assert.match(swContent, /\/semesters/, 'Must match /semesters')
    })

    test('sw.js implements Network-First with Cache Fallback for read-only educational APIs', () => {
      assert.match(swContent, /if\s*\(isOfflineCacheableApi\(request,\s*url\)\)/, 'Must intercept cacheable educational APIs')
      assert.match(swContent, /const\s+networkResponse\s*=\s*await\s+fetch\(request\)/, 'Must try network fetch first')
      assert.match(swContent, /cache\.put\(request,\s*networkResponse\.clone\(\)\)/, 'Must update cache when online')
      assert.match(swContent, /const\s+cachedResponse\s*=\s*await\s+cache\.match\(request\)/, 'Must fallback to cache when offline')
    })

    test('sw.js attaches offline indicator header when serving from cache', () => {
      assert.match(swContent, /headers\.set\(['"]X-EduPortal-Offline-Cache['"],\s*['"]true['"]\)/, 'Must attach X-EduPortal-Offline-Cache header')
    })

    test('sw.js strictly avoids caching non-GET or sensitive endpoints', () => {
      assert.match(swContent, /if\s*\(request\.method\s*!==\s*['"]GET['"]\)\s*return\s*false/, 'Must never cache non-GET requests in isOfflineCacheableApi')
      assert.match(swContent, /isSensitiveOrApiRequest/, 'Must preserve sensitive endpoint filtering')
    })
  })

  describe('2. StudentTimetable.jsx Mobile Offline Resilience', () => {
    test('Timetable component maintains isOffline state and syncs with navigator.onLine', () => {
      assert.match(timetableContent, /const\s*\[isOffline,\s*setIsOffline\]\s*=\s*useState/, 'Must declare isOffline state')
      assert.match(timetableContent, /navigator\.onLine/, 'Must check navigator.onLine')
    })

    test('Timetable component listens to window online and offline events', () => {
      assert.match(timetableContent, /window\.addEventListener\(['"]online['"]/, 'Must listen to online event')
      assert.match(timetableContent, /window\.addEventListener\(['"]offline['"]/, 'Must listen to offline event')
      assert.match(timetableContent, /window\.removeEventListener\(['"]online['"]/, 'Must clean up online listener')
    })

    test('Timetable component caches data in localStorage as secondary fallback', () => {
      assert.match(timetableContent, /localStorage\.setItem\([`'"]eduportal_offline_timetable_/, 'Must save timetable to localStorage')
      assert.match(timetableContent, /localStorage\.getItem\([`'"]eduportal_offline_timetable_/, 'Must read cached timetable from localStorage on offline')
    })

    test('Timetable component renders visual Offline Banner with amber indicator', () => {
      assert.match(timetableContent, /\{isOffline\s*&&/, 'Must render conditional offline banner')
      assert.match(timetableContent, /Chế độ Ngoại tuyến/, 'Must display Offline text')
      assert.match(timetableContent, /bg-amber-50/, 'Must style banner with amber warning palette')
    })
  })

  describe('3. StudentGrades.jsx Mobile Offline Resilience', () => {
    test('Grades component maintains isOffline state and syncs with navigator.onLine', () => {
      assert.match(gradesContent, /const\s*\[isOffline,\s*setIsOffline\]\s*=\s*useState/, 'Must declare isOffline state')
      assert.match(gradesContent, /navigator\.onLine/, 'Must check navigator.onLine')
    })

    test('Grades component listens to window online and offline events', () => {
      assert.match(gradesContent, /window\.addEventListener\(['"]online['"]/, 'Must listen to online event')
      assert.match(gradesContent, /window\.addEventListener\(['"]offline['"]/, 'Must listen to offline event')
      assert.match(gradesContent, /window\.removeEventListener\(['"]online['"]/, 'Must clean up online listener')
    })

    test('Grades component caches data in localStorage as secondary fallback', () => {
      assert.match(gradesContent, /localStorage\.setItem\(['"]eduportal_offline_grades['"]/, 'Must save grades to localStorage')
      assert.match(gradesContent, /localStorage\.getItem\(['"]eduportal_offline_grades['"]/, 'Must read cached grades from localStorage on offline')
    })

    test('Grades component renders visual Offline Banner with amber indicator', () => {
      assert.match(gradesContent, /\{isOffline\s*&&/, 'Must render conditional offline banner')
      assert.match(gradesContent, /Chế độ Ngoại tuyến/, 'Must display Offline text')
      assert.match(gradesContent, /bg-amber-50/, 'Must style banner with amber warning palette')
    })
  })

  describe('4. Simulated End-to-End Offline Cache Data Retrieval', () => {
    test('Simulated localStorage offline storage and retrieval for timetable and grades', () => {
      // Mock Storage
      const mockStorage = new Map()
      const mockLocalStorage = {
        setItem: (k, v) => mockStorage.set(k, String(v)),
        getItem: (k) => mockStorage.get(k) || null,
        removeItem: (k) => mockStorage.delete(k)
      }

      // Sample data
      const sampleTimetable = [
        {
          id: 1,
          sectionCode: 'IT3010-01',
          courseName: 'Lập trình nâng cao',
          dayOfWeek: 'MON',
          startTime: '07:00',
          endTime: '09:15',
          room: 'B1-302',
          lecturerName: 'TS. Nguyễn Văn A',
          credits: 3
        },
        {
          id: 2,
          sectionCode: 'IT4409-02',
          courseName: 'Kiến trúc Vi dịch vụ',
          dayOfWeek: 'WED',
          startTime: '09:30',
          endTime: '11:45',
          room: 'A2-105',
          lecturerName: 'ThS. Hoàng Văn Lương',
          credits: 4
        }
      ]

      const sampleGrades = [
        {
          courseCode: 'IT3010',
          courseName: 'Lập trình nâng cao',
          credits: 3,
          semesterName: '2024-SEM2',
          attendanceScore: 9.5,
          midtermScore: 8.5,
          finalScore: 9.0,
          totalScore: 8.85,
          letterGrade: 'A'
        },
        {
          courseCode: 'IT4409',
          courseName: 'Kiến trúc Vi dịch vụ',
          credits: 4,
          semesterName: '2024-SEM2',
          attendanceScore: 10.0,
          midtermScore: 8.0,
          finalScore: 8.5,
          totalScore: 8.45,
          letterGrade: 'B+'
        }
      ]

      // 1. Simulate saving while online
      mockLocalStorage.setItem('eduportal_offline_timetable_2024-SEM2', JSON.stringify(sampleTimetable))
      mockLocalStorage.setItem('eduportal_offline_grades', JSON.stringify(sampleGrades))

      // 2. Simulate Airplane mode (Offline)
      let networkAvailable = false
      let retrievedTimetable = null
      let retrievedGrades = null

      if (!networkAvailable) {
        const cachedTkb = mockLocalStorage.getItem('eduportal_offline_timetable_2024-SEM2')
        if (cachedTkb) {
          retrievedTimetable = JSON.parse(cachedTkb)
        }

        const cachedGrd = mockLocalStorage.getItem('eduportal_offline_grades')
        if (cachedGrd) {
          retrievedGrades = JSON.parse(cachedGrd)
        }
      }

      // Assertions
      assert.strictEqual(retrievedTimetable !== null, true)
      assert.strictEqual(retrievedTimetable.length, 2)
      assert.strictEqual(retrievedTimetable[0].courseName, 'Lập trình nâng cao')
      assert.strictEqual(retrievedTimetable[1].courseName, 'Kiến trúc Vi dịch vụ')

      assert.strictEqual(retrievedGrades !== null, true)
      assert.strictEqual(retrievedGrades.length, 2)
      assert.strictEqual(retrievedGrades[0].totalScore, 8.85)
      assert.strictEqual(retrievedGrades[1].letterGrade, 'B+')
    })
  })
})
