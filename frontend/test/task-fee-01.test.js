import { test, describe } from 'node:test'
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const frontendDir = path.resolve(__dirname, '..')

describe('TASK-FEE-01: Tuition & Financial Standing Separation Test Suite', () => {
  const tuitionPagePath = path.join(frontendDir, 'src', 'pages', 'StudentTuition.jsx')

  test('StudentTuition.jsx must exist', () => {
    assert.ok(fs.existsSync(tuitionPagePath), 'StudentTuition.jsx must exist')
  })

  test('StudentTuition.jsx cleanly derives isNotEnrolled status', () => {
    const content = fs.readFileSync(tuitionPagePath, 'utf8')

    assert.ok(content.includes('isNotEnrolled'), 'Must derive isNotEnrolled state')
    assert.ok(content.includes("tuition?.status === 'NOT_ENROLLED'"), 'Must recognize NOT_ENROLLED status')
    assert.ok(content.includes('!isNotEnrolled && tuition?.status === \'PAID\''), 'Must exclude unenrolled from isPaid')
  })

  test('StudentTuition.jsx displays 3 distinct financial metrics: Tổng học phí, Đã thanh toán, Còn phải thanh toán', () => {
    const content = fs.readFileSync(tuitionPagePath, 'utf8')

    assert.ok(content.includes('Tổng học phí'), 'Must display Tổng học phí metric')
    assert.ok(content.includes('Đã thanh toán'), 'Must display Đã thanh toán metric')
    assert.ok(content.includes('Còn phải thanh toán'), 'Must display Còn phải thanh toán metric')
    assert.ok(content.includes('formatVnd(tuition.totalAmount)'), 'Must format totalAmount')
    assert.ok(content.includes('formatVnd(tuition.paidAmount)'), 'Must format paidAmount')
    assert.ok(content.includes('tuition.remainingAmount'), 'Must format remainingAmount')
  })

  test('StudentTuition.jsx displays informative notice when no courses are enrolled for semester', () => {
    const content = fs.readFileSync(tuitionPagePath, 'utf8')

    assert.ok(
      content.includes('Bạn chưa đăng ký học phần trong học kỳ này. Chưa phát sinh học phí.'),
      'Must render clear message for semesters with no course registration'
    )
    assert.ok(
      content.includes('Đăng Ký Học Phần Kỳ Này'),
      'Must offer quick button navigating to course registration'
    )
  })

  test('StudentTuition.jsx hides payment buttons and receipts when not enrolled', () => {
    const content = fs.readFileSync(tuitionPagePath, 'utf8')

    // In isNotEnrolled branch, payment buttons are NOT rendered
    assert.ok(content.includes(') : isNotEnrolled ? ('), 'Must branch on isNotEnrolled')
  })

  test('StudentTuition.jsx displays Số dư bảo lưu when excessAmount > 0 (TASK-FEE-02)', () => {
    const content = fs.readFileSync(tuitionPagePath, 'utf8')

    assert.ok(content.includes('Số dư bảo lưu'), 'Must display Số dư bảo lưu when student drops course after payment')
    assert.ok(content.includes('tuition.excessAmount > 0'), 'Must conditionally render excessAmount card')
    assert.ok(content.includes('formatVnd(tuition.excessAmount)'), 'Must format excessAmount')
    assert.ok(content.includes('Ghi nhận số dư bảo lưu'), 'Must display explanatory notice for preserved credit balance')
  })
})
