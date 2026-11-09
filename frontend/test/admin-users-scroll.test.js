import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

describe('HOTFIX: Mouse Wheel Scrolling & Admin Users List Suite', () => {
  const indexCssPath = path.resolve(__dirname, '../src/index.css')
  const mainLayoutPath = path.resolve(__dirname, '../src/components/MainLayout.jsx')
  const sidebarPath = path.resolve(__dirname, '../src/components/Sidebar.jsx')
  const adminUsersPath = path.resolve(__dirname, '../src/pages/AdminUsers.jsx')

  test('1. index.css must NOT trap vertical mouse wheel scrolling with overscroll-behavior: contain', () => {
    const css = fs.readFileSync(indexCssPath, 'utf-8')

    // Must not combine .overflow-x-auto, .overflow-y-auto with blanket overscroll-behavior: contain
    const blanketTrapRegex = /\.overflow-x-auto,\s*\.overflow-y-auto\s*\{\s*[^}]*overscroll-behavior:\s*contain/
    assert.strictEqual(
      blanketTrapRegex.test(css),
      false,
      'index.css must not have blanket overscroll-behavior: contain on overflow-x-auto and overflow-y-auto'
    )

    // .overflow-x-auto must allow vertical scroll bubbling (overscroll-behavior-y: auto)
    assert.match(
      css,
      /\.overflow-x-auto\s*\{[^}]*overscroll-behavior-y:\s*auto/,
      '.overflow-x-auto must declare overscroll-behavior-y: auto to allow mouse wheel scrolling'
    )

    // .overflow-y-auto must declare overscroll-behavior-y: auto
    assert.match(
      css,
      /\.overflow-y-auto\s*\{[^}]*overscroll-behavior-y:\s*auto/,
      '.overflow-y-auto must declare overscroll-behavior-y: auto'
    )
  })

  test('2. MainLayout & Sidebar must implement bounded App Shell height', () => {
    const layout = fs.readFileSync(mainLayoutPath, 'utf-8')
    const sidebar = fs.readFileSync(sidebarPath, 'utf-8')

    // MainLayout container must have h-screen overflow-hidden
    assert.match(layout, /h-screen/, 'MainLayout must use h-screen to bound view height')
    assert.match(layout, /overflow-hidden/, 'MainLayout root container must hide outer scroll overflow')
    assert.match(layout, /<main[^>]*overflow-y-auto/, 'Main tag must own the vertical scrollbar')

    // Sidebar on desktop must use h-full or h-screen
    assert.match(sidebar, /md:h-full|md:h-screen/, 'Sidebar must fit full height on desktop')
  })

  test('3. AdminUsers.jsx must include safe property unwrapping, loading state and pagination', () => {
    const code = fs.readFileSync(adminUsersPath, 'utf-8')

    // Defensive unwrapping
    assert.match(code, /item\?\.user\s*\|\|\s*item/, 'AdminUsers must safely unwrap item?.user || item')

    // Loading indicator
    assert.match(code, /loading\s*\?/, 'AdminUsers must render a loading state when loading is true')

    // Empty list state
    assert.match(code, /users\.length\s*===\s*0/, 'AdminUsers must handle empty users list')

    // Pagination
    assert.match(code, /USERS_PER_PAGE/, 'AdminUsers must implement pagination constant')
    assert.match(code, /paginatedUsers/, 'AdminUsers must slice users for pagination')
    assert.match(code, /setCurrentPage/, 'AdminUsers must provide page navigation controls')
  })
})
