import React, { useEffect, useRef } from 'react'
import { X, AlertTriangle } from 'lucide-react'

/**
 * Modal xác nhận chốt bảng điểm.
 * Props:
 *   isOpen    - boolean
 *   onClose   - fn
 *   onConfirm - fn (async)
 *   loading   - boolean
 *   sectionCode - string
 *   totalStudents - number
 */
export function LockConfirmModal({ isOpen, onClose, onConfirm, loading, sectionCode, totalStudents }) {
  const cancelRef = useRef(null)

  // Focus trap: focus nút Cancel khi mở
  useEffect(() => {
    if (isOpen) cancelRef.current?.focus()
  }, [isOpen])

  // Đóng bằng Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lock-modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X size={18} />
        </button>

        {/* Icon + title */}
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
            <AlertTriangle size={20} className="text-amber-500" />
          </div>
          <div>
            <h2 id="lock-modal-title" className="text-base font-bold text-slate-800">
              Xác nhận chốt bảng điểm
            </h2>
            <p className="text-sm text-slate-500 mt-1 leading-relaxed">
              Bạn sắp chốt điểm lớp{' '}
              <span className="font-semibold text-slate-700">{sectionCode}</span>
              {' '}với <span className="font-semibold text-slate-700">{totalStudents}</span> sinh viên.
            </p>
          </div>
        </div>

        {/* Warning box */}
        <div className="bg-amber-50 border border-amber-100 rounded-lg px-4 py-3 text-xs text-amber-700 leading-relaxed">
          ⚠️ Sau khi chốt, <strong>không thể sửa lại điểm</strong>. Hệ thống sẽ tự động
          cập nhật tín chỉ tích lũy của sinh viên.
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <button
            ref={cancelRef}
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium
                       text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Huỷ bỏ
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-700
                       text-white text-sm font-semibold transition-colors
                       disabled:opacity-60 disabled:cursor-not-allowed
                       flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Đang chốt…
              </>
            ) : 'Chốt bảng điểm'}
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Modal hiển thị danh sách SV thiếu điểm khi lock thất bại (400).
 */
export function MissingGradesModal({ isOpen, onClose, missingStudents }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
          <X size={18} />
        </button>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0">
            <X size={20} className="text-rose-500" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800">Không thể chốt điểm</h2>
            <p className="text-sm text-slate-500 mt-1">
              {missingStudents.length} sinh viên chưa có đủ điểm giữa kỳ và cuối kỳ.
            </p>
          </div>
        </div>

        <div className="bg-rose-50 border border-rose-100 rounded-lg p-3 max-h-48 overflow-y-auto">
          <p className="text-xs font-semibold text-rose-700 mb-2 uppercase tracking-wide">
            Sinh viên thiếu điểm
          </p>
          <div className="space-y-1">
            {missingStudents.map((code) => (
              <div key={code} className="text-xs text-rose-600 font-mono bg-white rounded px-2 py-1 border border-rose-100">
                {code}
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium
                     text-slate-600 hover:bg-slate-50 transition-colors"
        >
          Đóng và nhập điểm còn thiếu
        </button>
      </div>
    </div>
  )
}
