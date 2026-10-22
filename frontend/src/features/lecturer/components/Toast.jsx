import React, { useEffect, useState } from 'react'
import { CheckCircle2, XCircle, AlertTriangle, X } from 'lucide-react'

const ICONS = {
  success: <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />,
  error:   <XCircle size={16} className="text-rose-500 shrink-0" />,
  warning: <AlertTriangle size={16} className="text-amber-500 shrink-0" />,
}

const BG = {
  success: 'bg-white border-emerald-200',
  error:   'bg-white border-rose-200',
  warning: 'bg-white border-amber-200',
}

/**
 * Toast đơn giản, tự dismiss sau duration ms.
 * Props: message, type ('success'|'error'|'warning'), onClose, duration
 */
export function Toast({ message, type = 'success', onClose, duration = 3500 }) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(false)
      setTimeout(onClose, 300)
    }, duration)
    return () => clearTimeout(t)
  }, [duration, onClose])

  return (
    <div
      className={`
        flex items-start gap-3 px-4 py-3 rounded-lg border shadow-lg text-sm
        transition-all duration-300
        ${BG[type]}
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
      `}
    >
      {ICONS[type]}
      <p className="text-slate-700 flex-1 leading-snug">{message}</p>
      <button
        onClick={() => { setVisible(false); setTimeout(onClose, 300) }}
        className="text-slate-400 hover:text-slate-600 shrink-0"
      >
        <X size={14} />
      </button>
    </div>
  )
}

/**
 * Toast container — вешаем в низ-правый угол.
 * toasts: [{ id, message, type }]
 */
export function ToastContainer({ toasts, onRemove }) {
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 w-80">
      {toasts.map((t) => (
        <Toast
          key={t.id}
          message={t.message}
          type={t.type}
          onClose={() => onRemove(t.id)}
        />
      ))}
    </div>
  )
}

/** Hook đơn giản để quản lý toast list */
export function useToast() {
  const [toasts, setToasts] = useState([])

  const add = (message, type = 'success') => {
    const id = Date.now()
    setToasts((prev) => [...prev, { id, message, type }])
  }

  const remove = (id) => setToasts((prev) => prev.filter((t) => t.id !== id))

  return { toasts, add, remove }
}
