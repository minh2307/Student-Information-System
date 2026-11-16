import { test, describe } from 'node:test'
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const frontendDir = path.resolve(__dirname, '..')

describe('AC Verification Suite: EDUP-202 AI Smart Scheduler Modal & 1-Click Batch Reserve', () => {
  const modalPath = path.join(frontendDir, 'src', 'components', 'ScheduleOptimizerModal.jsx')
  const courseRegPath = path.join(frontendDir, 'src', 'pages', 'CourseRegistration.jsx')

  test('ScheduleOptimizerModal.jsx exists and is integrated into CourseRegistration.jsx', () => {
    assert.ok(fs.existsSync(modalPath), 'ScheduleOptimizerModal.jsx must exist')
    assert.ok(fs.existsSync(courseRegPath), 'CourseRegistration.jsx must exist')

    const courseRegContent = fs.readFileSync(courseRegPath, 'utf8')
    assert.ok(courseRegContent.includes("import ScheduleOptimizerModal from '../components/ScheduleOptimizerModal'"), 'CourseRegistration must import ScheduleOptimizerModal')
    assert.ok(courseRegContent.includes('<ScheduleOptimizerModal'), 'CourseRegistration must render ScheduleOptimizerModal')
    assert.ok(courseRegContent.includes('setOptimizerModalOpen(true)'), 'Must have button to trigger modal open')
  })

  test('[AC-1] Selection Form: Checkbox môn học, hạn mức 12-24 TC (BR-01), ca học, tránh thứ', () => {
    const content = fs.readFileSync(modalPath, 'utf8')

    // Course selection & credit calculation
    assert.ok(content.includes('selectedCourseIds'), 'Must track selected courses')
    assert.ok(content.includes('selectedCredits'), 'Must calculate total selected credits')
    assert.ok(content.includes('24 TC'), 'Must enforce max 24 TC limit (BR-01)')
    assert.ok(content.includes('Cần ≥ 12 TC'), 'Must show min 12 TC guideline')

    // Preferred shift options (Morning, Afternoon, Any)
    assert.ok(content.includes('preferredShift'), 'Must track preferred shift')
    assert.ok(content.includes('MORNING'), 'Must support MORNING shift')
    assert.ok(content.includes('AFTERNOON'), 'Must support AFTERNOON shift')

    // Avoid days selector
    assert.ok(content.includes('avoidDays'), 'Must track avoidDays')
    assert.ok(content.includes('DAY_COLUMNS'), 'Must define day columns')
  })

  test('[AC-2] AI Solving & Top 3 Tabs preview with Fitness Score and Week Matrix', () => {
    const content = fs.readFileSync(modalPath, 'utf8')

    // AI Solving state & API trigger
    assert.ok(content.includes('api.post(\'/student/schedule-optimizer/solve\''), 'Must call solve API')
    assert.ok(content.includes('setSolving(true)'), 'Must toggle solving loading state')
    assert.ok(content.includes('Loader2') && content.includes('animate-spin'), 'Must display loading spinner while solving')

    // Top 3 Plan Tabs with match percentage badge
    assert.ok(content.includes('result.plans'), 'Must render calculated plans')
    assert.ok(content.includes('p.matchPercentage'), 'Must render match percentage for each plan tab')
    assert.ok(content.includes('Phương án {p.planIndex}'), 'Must display plan index tab headers')

    // Weekly visual matrix & list view
    assert.ok(content.includes("previewMode === 'grid'"), 'Must support grid view (Lịch tuần)')
    assert.ok(content.includes("previewMode === 'list'"), 'Must support list view (Chi tiết)')
    assert.ok(content.includes('courseColorMap'), 'Must render color-coded courses on timetable')
  })

  test('[AC-3] 1-Click Batch Reserve: Atomic 5-Minute Hold & Auto-redirect', () => {
    const content = fs.readFileSync(modalPath, 'utf8')

    // 1-Click batch reserve button & handler
    assert.ok(content.includes('handleBatchReserve'), 'Must implement handleBatchReserve function')
    assert.ok(content.includes('api.post(\'/student/schedule-optimizer/batch-reserve\''), 'Must call batch-reserve endpoint')
    assert.ok(content.includes('1-Chạm Giữ Chỗ Cả Phương Án (5 Phút)'), 'Must display 1-touch batch reserve button text')

    // Feedback & 5-minute lock indicator
    assert.ok(content.includes('Đã giữ chỗ thành công'), 'Must display success notification')
    assert.ok(content.includes('5 phút'), 'Must explicitly mention 5-minute lock duration')
    assert.ok(content.includes('Đến màn hình Đăng ký'), 'Must provide navigation back to registration screen')
    assert.ok(content.includes('onReservationSuccess'), 'Must callback parent to refresh active holds and live seats')
  })
})
