import { create } from 'zustand'

export const useToastStore = create((set) => ({
  toasts: [],
  addToast: ({ type = 'info', message, title, duration = 4000 }) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9)
    set((state) => ({
      toasts: [...state.toasts, { id, type, message, title, duration }],
    }))

    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }))
      }, duration)
    }
  },
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }))
  },
}))

export const toast = {
  success: (message, title) => useToastStore.getState().addToast({ type: 'success', message, title }),
  error: (message, title) => useToastStore.getState().addToast({ type: 'error', message, title }),
  warning: (message, title) => useToastStore.getState().addToast({ type: 'warning', message, title }),
  info: (message, title) => useToastStore.getState().addToast({ type: 'info', message, title }),
}
