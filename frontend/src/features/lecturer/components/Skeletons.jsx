import React from 'react'

/**
 * Skeleton loading rows cho bảng sinh viên
 */
export function TableRowSkeleton({ cols = 8 }) {
  return (
    <>
      {[...Array(5)].map((_, i) => (
        <tr key={i} className="border-b border-slate-100">
          {[...Array(cols)].map((_, j) => (
            <td key={j} className="px-4 py-3.5">
              <div
                className="h-4 bg-slate-100 rounded animate-pulse"
                style={{ width: j === 0 ? '80%' : j === 1 ? '60%' : '50%' }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

/**
 * Skeleton card cho danh sách lớp học phần
 */
export function ClassCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-slate-100 p-5 space-y-4 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <div className="h-3 bg-slate-100 rounded w-24" />
          <div className="h-5 bg-slate-100 rounded w-3/4" />
        </div>
        <div className="h-6 bg-slate-100 rounded w-16 ml-4" />
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-slate-100 rounded w-1/2" />
        <div className="h-3 bg-slate-100 rounded w-2/5" />
        <div className="h-3 bg-slate-100 rounded w-1/3" />
      </div>
      <div className="pt-3 border-t border-slate-100">
        <div className="h-8 bg-slate-100 rounded-lg w-full" />
      </div>
    </div>
  )
}

/**
 * Empty state reusable
 */
export function EmptyState({ icon, title, description }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4 text-slate-400">
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
      {description && (
        <p className="text-xs text-slate-400 mt-1 max-w-xs">{description}</p>
      )}
    </div>
  )
}
