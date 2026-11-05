/**
 * Pure JavaScript Markdown Parser Utility for Academic Advisor
 * Handles block-level structures (tables, headings, dividers, blockquotes, lists, code blocks)
 * and inline styling tokens (**bold**, *italic*, `code`, [link](url)).
 */

/**
 * Tokenizes inline text into typed segments
 */
export const tokenizeInline = (text) => {
  if (!text) return []
  const regex = /(\*\*.*?\*\*|\*.*?\*|`.*?`|\[.*?\]\(.*?\))/g
  const tokens = []
  let lastIdx = 0
  let match

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIdx) {
      tokens.push({
        type: 'text',
        content: text.substring(lastIdx, match.index),
      })
    }
    const token = match[0]
    if (token.startsWith('**') && token.endsWith('**')) {
      tokens.push({ type: 'bold', content: token.slice(2, -2) })
    } else if (token.startsWith('*') && token.endsWith('*')) {
      tokens.push({ type: 'italic', content: token.slice(1, -1) })
    } else if (token.startsWith('`') && token.endsWith('`')) {
      tokens.push({ type: 'code', content: token.slice(1, -1) })
    } else if (token.startsWith('[') && token.includes('](')) {
      const parts = token.match(/\[(.*?)\]\((.*?)\)/)
      tokens.push({ type: 'link', label: parts?.[1] || '', url: parts?.[2] || '#' })
    }
    lastIdx = regex.lastIndex
  }

  if (lastIdx < text.length) {
    tokens.push({ type: 'text', content: text.substring(lastIdx) })
  }

  return tokens
}

/**
 * Checks if a line is a markdown table separator (e.g. |---|:---:|---:|)
 */
export const isTableSeparator = (line) => {
  const trimmed = line.trim()
  if (!trimmed.includes('-')) return false
  const parts = trimmed.replace(/^\|/, '').replace(/\|$/, '').split('|')
  return (
    parts.length >= 2 &&
    parts.every((p) => /^[\s:-]+$/.test(p) && p.includes('-'))
  )
}

/**
 * Splits a table line into trimmed cells
 */
export const parseTableRow = (line) => {
  let trimmed = line.trim()
  if (trimmed.startsWith('|')) trimmed = trimmed.slice(1)
  if (trimmed.endsWith('|')) trimmed = trimmed.slice(0, -1)
  return trimmed.split('|').map((c) => c.trim())
}

/**
 * Determines text alignment for table columns from separator line
 */
export const parseAlignments = (separatorLine) => {
  const parts = parseTableRow(separatorLine)
  return parts.map((part) => {
    const left = part.startsWith(':')
    const right = part.endsWith(':')
    if (left && right) return 'text-center'
    if (right) return 'text-right'
    return 'text-left'
  })
}

/**
 * Parses markdown text into structural blocks
 */
export const parseMarkdownBlocks = (text) => {
  if (!text) return []
  const lines = text.split('\n')
  const blocks = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // 1. Table Detection
    if (line.trim().startsWith('|')) {
      // Check if next line is a valid table separator
      if (i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
        const tableLines = [line, lines[i + 1]]
        i += 2
        // Collect following rows that start with |
        while (i < lines.length && lines[i].trim().startsWith('|')) {
          tableLines.push(lines[i])
          i++
        }
        blocks.push({ type: 'table', lines: tableLines })
        continue
      }
    }

    // 2. Fenced Code Block
    if (line.trim().startsWith('```')) {
      const codeLines = []
      i++
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      if (i < lines.length) i++ // skip closing ```
      blocks.push({ type: 'code', content: codeLines.join('\n') })
      continue
    }

    // 3. Horizontal Rule / Divider
    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      blocks.push({ type: 'divider' })
      i++
      continue
    }

    // 4. Headings (#, ##, ###, ####)
    if (/^#{1,6}\s+/.test(line)) {
      const level = line.match(/^(#{1,6})\s+/)[1].length
      blocks.push({
        type: 'heading',
        level,
        text: line.replace(/^#{1,6}\s+/, ''),
      })
      i++
      continue
    }

    // 5. Blockquote (> quote)
    if (line.trim().startsWith('>')) {
      blocks.push({
        type: 'quote',
        text: line.replace(/^\s*>\s?/, ''),
      })
      i++
      continue
    }

    // 6. Unordered List (- item, * item, + item, • item)
    if (/^\s*([•\-*+]|\(?[*•\-]\)?)\s+/.test(line)) {
      blocks.push({
        type: 'unordered-list',
        text: line.replace(/^\s*([•\-*+]|\(?[*•\-]\)?)\s+/, ''),
      })
      i++
      continue
    }

    // 7. Ordered List (1. item, 2. item)
    const numMatch = line.match(/^\s*(\d+)\.\s+(.*)$/)
    if (numMatch) {
      blocks.push({
        type: 'ordered-list',
        num: numMatch[1],
        text: numMatch[2],
      })
      i++
      continue
    }

    // 8. Empty Line
    if (line.trim() === '') {
      blocks.push({ type: 'empty' })
      i++
      continue
    }

    // 9. Standard Paragraph
    blocks.push({ type: 'paragraph', text: line })
    i++
  }

  return blocks
}
