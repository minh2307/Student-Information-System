import { test, describe } from 'node:test'
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const frontendDir = path.resolve(__dirname, '..')

describe('HOTFIX-PAYOS-FE: PayOS Checkout & Tuition Settlement Test Suite', () => {

  describe('1. Currency Converter Verification', () => {
    test('numberToVietnameseWords formats exact VND currency text', async () => {
      const { numberToVietnameseWords } = await import('../src/utils/currencyWords.js')
      assert.ok(typeof numberToVietnameseWords === 'function', 'numberToVietnameseWords must be a function')

      const words1 = numberToVietnameseWords(4800000)
      assert.strictEqual(words1, 'Bốn triệu tám trăm nghìn đồng chẵn.')

      const words2 = numberToVietnameseWords(450000)
      assert.strictEqual(words2, 'Bốn trăm năm mươi nghìn đồng chẵn.')

      const wordsZero = numberToVietnameseWords(0)
      assert.strictEqual(wordsZero, 'Không đồng')
    })
  })

  describe('2. Package Dependency & PayOS Checkout Integration', () => {
    const pkgPath = path.join(frontendDir, 'package.json')

    test('package.json contains @payos/payos-checkout dependency', () => {
      assert.ok(fs.existsSync(pkgPath), 'package.json must exist')
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
      assert.ok(pkg.dependencies['@payos/payos-checkout'], '@payos/payos-checkout must be in dependencies')
    })
  })

  describe('3. StudentTuition.jsx PayOS Checkout & Return URL Architecture', () => {
    const tuitionPagePath = path.join(frontendDir, 'src', 'pages', 'StudentTuition.jsx')

    test('StudentTuition.jsx exists and imports required PayOS & Router hooks', () => {
      assert.ok(fs.existsSync(tuitionPagePath), 'StudentTuition.jsx must exist')
      const content = fs.readFileSync(tuitionPagePath, 'utf8')

      // Check essential imports
      assert.ok(content.includes("from '@payos/payos-checkout'"), 'Must import from @payos/payos-checkout')
      assert.ok(content.includes('useSearchParams'), 'Must use useSearchParams to parse return URL query parameters')
      assert.ok(content.includes('usePayOS'), 'Must use usePayOS hook')
    })

    test('StudentTuition.jsx handles PayOS Return URL parameters (status, code, cancel, orderCode)', () => {
      const content = fs.readFileSync(tuitionPagePath, 'utf8')

      assert.ok(content.includes("searchParams.get('status')"), 'Must parse status param')
      assert.ok(content.includes("searchParams.get('code')"), 'Must parse code param')
      assert.ok(content.includes("searchParams.get('cancel')"), 'Must parse cancel param')
      assert.ok(content.includes("searchParams.get('orderCode')"), 'Must parse orderCode param')

      // Check success condition
      assert.ok(content.includes("statusParam === 'PAID'") || content.includes("codeParam === '00'"), 'Must detect PAID or 00 success')

      // Check URL searchParams clean up
      assert.ok(content.includes('setSearchParams({}, { replace: true })'), 'Must clean searchParams to prevent duplicate toasts on refresh')
    })

    test('StudentTuition.jsx provides PayOS Embedded Checkout & Dynamic VietQR Tabs', () => {
      const content = fs.readFileSync(tuitionPagePath, 'utf8')

      assert.ok(content.includes('activePayOsTab'), 'Must have tab switcher state')
      assert.ok(content.includes('payos-checkout-container'), 'Must have PayOS container ID element')
      assert.ok(content.includes('Nhúng PayOS Checkout'), 'Must provide embedded checkout tab')
      assert.ok(content.includes('Mã VietQR'), 'Must provide VietQR tab')
      assert.ok(content.includes('handleSimulatePayOsWebhook'), 'Must provide simulated webhook for sandbox verification')
    })

    test('StudentTuition.jsx supports Return Notification Banner and Printable Official Receipt', () => {
      const content = fs.readFileSync(tuitionPagePath, 'utf8')

      assert.ok(content.includes('returnStatusInfo'), 'Must render return status notification banner')
      assert.ok(content.includes('showReceiptModal'), 'Must support electronic receipt modal')
      assert.ok(content.includes('window.print()'), 'Must allow printing official receipt')
      assert.ok(content.includes('Ký số điện tử SHA-256'), 'Must display SHA-256 electronic seal on receipt')
    })
  })
})
