import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  parseMarkdownBlocks,
  parseTableRow,
  parseAlignments,
  isTableSeparator,
  tokenizeInline,
} from '../src/utils/markdownParser.js'

describe('Academic Advisor Markdown & Table Parsing Suite', () => {
  it('correctly detects and parses full markdown tables with alignments', () => {
    const raw = `
2. Phân tích các môn học đang đăng ký kỳ này

| Mã môn học | Tên môn học | Tín chỉ | Trạng thái | Thời điểm hoàn thành |
| :--- | :--- | :---: | ---: | :--- |
| CS201 | Cấu trúc dữ liệu và giải thuật | 3 | Hoàn thành | HK1 2023-2024 |
| CS301 | Cơ sở dữ liệu | 3 | Hoàn thành | HK2 2023-2024 |
| CS401 | Phát triển ứng dụng Web | 3 | Đang học | Kỳ này |
`
    const blocks = parseMarkdownBlocks(raw)
    const tableBlock = blocks.find((b) => b.type === 'table')

    assert.ok(tableBlock, 'Should have parsed a table block')
    assert.equal(tableBlock.lines.length, 5, 'Table should have 5 lines (header + sep + 3 rows)')
    assert.ok(tableBlock.lines[0].includes('Mã môn học'))
    assert.ok(tableBlock.lines[1].includes(':---:'))
    assert.ok(tableBlock.lines[2].includes('CS201'))
    assert.ok(tableBlock.lines[3].includes('CS301'))
    assert.ok(tableBlock.lines[4].includes('CS401'))

    const headers = parseTableRow(tableBlock.lines[0])
    assert.deepEqual(headers, ['Mã môn học', 'Tên môn học', 'Tín chỉ', 'Trạng thái', 'Thời điểm hoàn thành'])

    const alignments = parseAlignments(tableBlock.lines[1])
    assert.deepEqual(alignments, ['text-left', 'text-left', 'text-center', 'text-right', 'text-left'])

    const row1 = parseTableRow(tableBlock.lines[2])
    assert.deepEqual(row1, ['CS201', 'Cấu trúc dữ liệu và giải thuật', '3', 'Hoàn thành', 'HK1 2023-2024'])
  })

  it('correctly parses ordered lists, unordered lists, and dividers', () => {
    const raw = `
---
Lời khuyên từ cố vấn:
• Điểm C-GPA tích lũy: 8.74/10.0 (Xếp loại: Xuất sắc).
- Tỷ lệ chuyên cần: 99.0%.
1. Hủy môn CS201 bị trùng
2. Đăng ký bổ sung môn CS402
> Lưu ý: Hãy đối chiếu với Phòng Đào tạo
`
    const blocks = parseMarkdownBlocks(raw)

    const divider = blocks.find((b) => b.type === 'divider')
    assert.ok(divider, 'Should parse divider (---)')

    const bulletItems = blocks.filter((b) => b.type === 'unordered-list')
    assert.equal(bulletItems.length, 2, 'Should parse bullet lists with • and -')
    assert.ok(bulletItems[0].text.includes('Điểm C-GPA'))
    assert.ok(bulletItems[1].text.includes('Tỷ lệ chuyên cần'))

    const orderedItems = blocks.filter((b) => b.type === 'ordered-list')
    assert.equal(orderedItems.length, 2, 'Should parse ordered lists (1. and 2.)')
    assert.equal(orderedItems[0].num, '1')
    assert.equal(orderedItems[1].num, '2')

    const quote = blocks.find((b) => b.type === 'quote')
    assert.ok(quote, 'Should parse blockquote (> ...)')
    assert.ok(quote.text.includes('Lưu ý'))
  })

  it('gracefully handles streaming partial tables without crashing', () => {
    // Only header and separator streamed so far
    const partial1 = '| Mã môn | Tên môn |\n|---|---|'
    const blocks1 = parseMarkdownBlocks(partial1)
    assert.equal(blocks1[0].type, 'table')
    assert.equal(blocks1[0].lines.length, 2)

    // Header, separator, and half a row streamed
    const partial2 = '| Mã môn | Tên môn |\n|---|---|\n| CS201 | Cấu trúc'
    const blocks2 = parseMarkdownBlocks(partial2)
    assert.equal(blocks2[0].type, 'table')
    assert.equal(blocks2[0].lines.length, 3)

    const parsedPartial = parseTableRow(blocks2[0].lines[2])
    assert.equal(parsedPartial[0], 'CS201')
    assert.equal(parsedPartial[1], 'Cấu trúc')
  })

  it('handles headings of different levels', () => {
    const raw = `
# Tiêu đề 1
## Tiêu đề 2
### Tiêu đề 3
`
    const blocks = parseMarkdownBlocks(raw)
    const headings = blocks.filter((b) => b.type === 'heading')
    assert.equal(headings.length, 3)
    assert.equal(headings[0].level, 1)
    assert.equal(headings[1].level, 2)
    assert.equal(headings[2].level, 3)
  })

  it('tokenizes inline styles for bold, code, and links', () => {
    const tokens = tokenizeInline('Môn `CS401` yêu cầu **CS201** [Xem chi tiết](https://rikkei.edu.vn)')
    assert.ok(tokens.some((t) => t.type === 'code' && t.content === 'CS401'))
    assert.ok(tokens.some((t) => t.type === 'bold' && t.content === 'CS201'))
    assert.ok(tokens.some((t) => t.type === 'link' && t.label === 'Xem chi tiết'))
  })

  it('validates table separator detection accurately', () => {
    assert.equal(isTableSeparator('|---|---|---|'), true)
    assert.equal(isTableSeparator('| :--- | :---: | ---: |'), true)
    assert.equal(isTableSeparator('| - | - |'), true)
    assert.equal(isTableSeparator('not a separator'), false)
    assert.equal(isTableSeparator('---'), false)
  })
})
