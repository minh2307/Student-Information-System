import React from 'react'
import {
  parseMarkdownBlocks,
  parseTableRow,
  parseAlignments,
  tokenizeInline,
} from '../utils/markdownParser'

/**
 * Parses inline formatting: **bold**, *italic*, `code`, [link](url)
 */
export const renderInline = (text) => {
  if (!text) return null
  const tokens = tokenizeInline(text)

  return tokens.map((t, idx) => {
    switch (t.type) {
      case 'bold':
        return (
          <strong key={idx} className="font-semibold text-stone-900">
            {t.content}
          </strong>
        )
      case 'italic':
        return (
          <em key={idx} className="italic text-stone-800">
            {t.content}
          </em>
        )
      case 'code':
        return (
          <code
            key={idx}
            className="px-1.5 py-0.5 mx-0.5 bg-stone-100 text-red-700 font-mono text-[11px] rounded border border-stone-200 font-semibold"
          >
            {t.content}
          </code>
        )
      case 'link':
        return (
          <a
            key={idx}
            href={t.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-red-700 hover:text-red-800 underline font-medium"
          >
            {t.label}
          </a>
        )
      default:
        return <React.Fragment key={idx}>{t.content}</React.Fragment>
    }
  })
}

/**
 * Renders cell content with smart status badges
 */
const renderTableCell = (cell) => {
  const trimmed = cell.trim()
  const lower = trimmed.toLowerCase()

  // Success / Completed badges
  if (
    lower === 'hoàn thành' ||
    lower === 'đã hoàn thành' ||
    lower === 'đạt' ||
    lower === 'pass' ||
    lower === 'xuất sắc' ||
    lower === 'giỏi'
  ) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
        {trimmed}
      </span>
    )
  }

  // Conflict / Warning / Failed badges
  if (
    lower === 'bị trùng' ||
    lower === 'trùng lịch' ||
    lower === 'cảnh báo' ||
    lower === 'chưa đạt' ||
    lower === 'rớt' ||
    lower === 'học lại' ||
    lower === 'fail'
  ) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200 font-mono">
        {trimmed}
      </span>
    )
  }

  // In-progress badges
  if (
    lower === 'đang học' ||
    lower === 'đang đăng ký' ||
    lower === 'đã đăng ký' ||
    lower === 'in progress'
  ) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200 font-mono">
        {trimmed}
      </span>
    )
  }

  // Pending / Waived badges
  if (lower === 'miễn học' || lower === 'chờ duyệt' || lower === 'chưa học') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-stone-100 text-stone-600 border border-stone-300 font-mono">
        {trimmed}
      </span>
    )
  }

  return renderInline(cell)
}

/**
 * MarkdownRenderer Component
 */
export const MarkdownRenderer = ({ content, className = '' }) => {
  if (!content) return null
  const blocks = parseMarkdownBlocks(content)

  return (
    <div className={`space-y-1.5 leading-relaxed text-xs sm:text-[13px] ${className}`}>
      {blocks.map((block, idx) => {
        switch (block.type) {
          case 'table': {
            const headers = parseTableRow(block.lines[0])
            const alignments = parseAlignments(block.lines[1])
            const rows = block.lines.slice(2).map(parseTableRow)

            return (
              <div
                key={idx}
                className="w-full my-2.5 overflow-x-auto rounded-xl border border-stone-200/90 shadow-2xs bg-white"
              >
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-stone-100/80 border-b border-stone-200 text-stone-700 font-semibold font-mono text-[11px] uppercase tracking-wider">
                    <tr>
                      {headers.map((h, hIdx) => (
                        <th
                          key={hIdx}
                          className={`px-3.5 py-2.5 whitespace-nowrap text-[11px] font-semibold text-stone-700 ${
                            alignments[hIdx] || 'text-left'
                          }`}
                        >
                          {renderInline(h)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 bg-white">
                    {rows.map((row, rIdx) => (
                      <tr
                        key={rIdx}
                        className="hover:bg-stone-50/70 transition-colors"
                      >
                        {headers.map((_, cIdx) => (
                          <td
                            key={cIdx}
                            className={`px-3.5 py-2 text-stone-700 text-xs ${
                              alignments[cIdx] || 'text-left'
                            }`}
                          >
                            {renderTableCell(row[cIdx] || '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          }

          case 'heading': {
            if (block.level === 1) {
              return (
                <h3 key={idx} className="font-bold text-stone-900 text-sm sm:text-base mt-2.5 mb-1">
                  {renderInline(block.text)}
                </h3>
              )
            }
            if (block.level === 2) {
              return (
                <h4 key={idx} className="font-bold text-stone-900 text-xs sm:text-sm mt-2 mb-1">
                  {renderInline(block.text)}
                </h4>
              )
            }
            return (
              <h5 key={idx} className="font-bold text-stone-900 text-xs mt-1.5 mb-0.5">
                {renderInline(block.text)}
              </h5>
            )
          }

          case 'divider':
            return <hr key={idx} className="my-2.5 border-stone-200" />

          case 'quote':
            return (
              <blockquote
                key={idx}
                className="border-l-3 border-red-600/70 pl-3 my-1.5 text-stone-600 italic bg-red-50/40 py-1.5 rounded-r text-xs"
              >
                {renderInline(block.text)}
              </blockquote>
            )

          case 'unordered-list':
            return (
              <div key={idx} className="flex items-start gap-2 my-0.5 pl-1">
                <span className="text-red-700 font-bold shrink-0 mt-0.5 leading-none">•</span>
                <div className="flex-1 text-stone-700 leading-relaxed">
                  {renderInline(block.text)}
                </div>
              </div>
            )

          case 'ordered-list':
            return (
              <div key={idx} className="flex items-start gap-2 my-0.5 pl-1">
                <span className="text-red-700 font-semibold font-mono text-[11px] shrink-0 mt-0.5 leading-none">
                  {block.num}.
                </span>
                <div className="flex-1 text-stone-700 leading-relaxed">
                  {renderInline(block.text)}
                </div>
              </div>
            )

          case 'code':
            return (
              <pre
                key={idx}
                className="my-2 p-3 bg-stone-900 text-stone-100 rounded-xl text-xs font-mono overflow-x-auto border border-stone-800"
              >
                <code>{block.content}</code>
              </pre>
            )

          case 'empty':
            return <div key={idx} className="h-1" />

          case 'paragraph':
          default:
            return (
              <p key={idx} className="my-0.5 leading-relaxed text-stone-800">
                {renderInline(block.text)}
              </p>
            )
        }
      })}
    </div>
  )
}

export default MarkdownRenderer
