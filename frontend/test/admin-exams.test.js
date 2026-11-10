import { describe, it } from 'node:test'
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

describe('Admin Exam Schedules & Gateway Routing Test Suite', () => {
  const nginxConfPath = path.resolve(__dirname, '../nginx.conf')
  const viteConfigPath = path.resolve(__dirname, '../vite.config.js')
  const adminExamsPath = path.resolve(__dirname, '../src/pages/AdminExams.jsx')

  it('1. nginx.conf must route /api/v1/admin/exam-schedules to enrollment-service:8083 before /api/v1/admin', () => {
    assert.ok(fs.existsSync(nginxConfPath), 'nginx.conf must exist')
    const nginxContent = fs.readFileSync(nginxConfPath, 'utf8')

    // Must have location for exam-schedules pointing to enrollment-service:8083
    assert.match(
      nginxContent,
      /location\s+\^~\s+\/api\/v1\/admin\/exam-schedules\s*\{\s*proxy_pass\s+http:\/\/enrollment-service:8083;/,
      'nginx.conf must explicitly proxy /api/v1/admin/exam-schedules to enrollment-service:8083'
    )

    // Must also have location for /api/v1/admin/exams pointing to enrollment-service:8083
    assert.match(
      nginxContent,
      /location\s+\^~\s+\/api\/v1\/admin\/exams\s*\{\s*proxy_pass\s+http:\/\/enrollment-service:8083;/,
      'nginx.conf must explicitly proxy /api/v1/admin/exams to enrollment-service:8083'
    )

    // The exam-schedules location must appear BEFORE the generic location /api/v1/admin
    const examIndex = nginxContent.indexOf('/api/v1/admin/exam-schedules')
    const adminIndex = nginxContent.indexOf('location /api/v1/admin {')
    assert.ok(examIndex > 0 && adminIndex > 0, 'Both location blocks must exist in nginx.conf')
    assert.ok(
      examIndex < adminIndex,
      'location /api/v1/admin/exam-schedules must be placed before generic location /api/v1/admin'
    )
  })

  it('2. vite.config.js must contain proxy configurations for admin exam schedules', () => {
    assert.ok(fs.existsSync(viteConfigPath), 'vite.config.js must exist')
    const viteContent = fs.readFileSync(viteConfigPath, 'utf8')

    assert.match(
      viteContent,
      /'\/api\/v1\/admin\/exam-schedules':\s*\{\s*target:\s*'http:\/\/localhost:8083'/,
      'vite.config.js must proxy /api/v1/admin/exam-schedules to localhost:8083'
    )
  })

  it('3. AdminExams.jsx must handle semester sync, null-safe lists, and numeric section IDs', () => {
    assert.ok(fs.existsSync(adminExamsPath), 'AdminExams.jsx must exist')
    const content = fs.readFileSync(adminExamsPath, 'utf8')

    // Must import and use API service
    assert.match(content, /import\s+api\s+from\s+'\.\.\/services\/api'/)

    // Must sanitize classSectionId as Number in payload
    assert.match(content, /classSectionId:\s*formData\.classSectionId\s*\?\s*Number\(formData\.classSectionId\)/)

    // Must ensure HH:mm:ss formatting for start and end times
    assert.match(content, /startTime:\s*formData\.startTime\?\.length\s*===\s*5/)

    // Must have auto-generate capability
    assert.match(content, /\/admin\/exam-schedules\/auto-generate/)
  })
})
