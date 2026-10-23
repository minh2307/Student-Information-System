import React, { useEffect } from 'react'
import { useConfirmStore } from '../../store/confirmStore'
import { AlertTriangle, AlertCircle, Info, X } from 'lucide-react'

export const GlobalConfirmModal = () => {
  const {
    isOpen,
    title,
    message,
    confirmText,
    cancelText,
    variant,
    handleConfirm,
    handleCancel,
  } = useConfirmStore()

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return
      if (e.key === 'Escape') handleCancel()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, handleCancel])

  if (!isOpen) return null

  const isDanger = variant === 'danger'
  const isWarning = variant === 'warning'

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-2xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200 animate-in zoom-in-95 duration-200">
        <div className="flex items-start gap-4">
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${
              isDanger
                ? 'bg-red-50 text-red-700 border-red-200'
                : isWarning
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-stone-50 text-stone-700 border-stone-200'
            }`}
          >
            {isDanger && <AlertTriangle size={22} />}
            {isWarning && <AlertCircle size={22} />}
            {!isDanger && !isWarning && <Info size={22} />}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-stone-900 tracking-tight">
              {title}
            </h3>
            <p className="text-xs text-stone-600 mt-1.5 leading-relaxed font-normal whitespace-pre-wrap">
              {message}
            </p>
          </div>

          <button
            onClick={handleCancel}
            className="text-stone-400 hover:text-stone-600 p-1 rounded-lg transition shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex items-center justify-end gap-2.5 mt-6 pt-3 border-t border-stone-100">
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:text-stone-800 hover:bg-stone-100 transition border border-stone-200/80"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className={`px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-2xs transition ${
              isDanger
                ? 'bg-red-700 hover:bg-red-800'
                : isWarning
                ? 'bg-amber-600 hover:bg-amber-700'
                : 'bg-stone-900 hover:bg-stone-800'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
