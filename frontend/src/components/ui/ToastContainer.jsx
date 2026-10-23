import React from 'react'
import { useToastStore } from '../../store/toastStore'
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react'

export const ToastContainer = () => {
  const { toasts, removeToast } = useToastStore()

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success'
        const isError = toast.type === 'error'
        const isWarning = toast.type === 'warning'

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto p-4 rounded-xl border shadow-xl bg-white flex items-start gap-3 transition-all duration-300 animate-in slide-in-from-top-2 fade-in ${
              isSuccess
                ? 'border-emerald-200 text-stone-900 bg-emerald-50/30'
                : isError
                ? 'border-red-200 text-stone-900 bg-red-50/30'
                : isWarning
                ? 'border-amber-200 text-stone-900 bg-amber-50/30'
                : 'border-stone-200 text-stone-900 bg-stone-50/30'
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {isSuccess && <CheckCircle2 size={18} className="text-emerald-600" />}
              {isError && <AlertCircle size={18} className="text-red-700" />}
              {isWarning && <AlertTriangle size={18} className="text-amber-600" />}
              {!isSuccess && !isError && !isWarning && <Info size={18} className="text-stone-700" />}
            </div>

            <div className="flex-1 min-w-0">
              {toast.title && (
                <h4 className="text-xs font-bold text-stone-900 leading-tight mb-0.5">
                  {toast.title}
                </h4>
              )}
              <p className="text-xs text-stone-700 leading-relaxed font-medium">
                {toast.message}
              </p>
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              className="shrink-0 text-stone-400 hover:text-stone-600 p-0.5 rounded transition"
            >
              <X size={14} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
