import { create } from 'zustand'

export const useConfirmStore = create((set, get) => ({
  isOpen: false,
  title: '',
  message: '',
  confirmText: 'Xác nhận',
  cancelText: 'Hủy bỏ',
  variant: 'danger', // 'danger' | 'warning' | 'info'
  onConfirm: null,
  onCancel: null,
  resolve: null,

  openConfirm: ({
    title = 'Xác nhận hành động',
    message = 'Bạn có chắc chắn muốn thực hiện hành động này?',
    confirmText = 'Xác nhận',
    cancelText = 'Hủy bỏ',
    variant = 'danger',
    onConfirm = null,
    onCancel = null,
  }) => {
    return new Promise((resolve) => {
      set({
        isOpen: true,
        title,
        message,
        confirmText,
        cancelText,
        variant,
        onConfirm,
        onCancel,
        resolve,
      })
    })
  },

  handleConfirm: async () => {
    const { onConfirm, resolve } = get()
    set({ isOpen: false })
    if (onConfirm) {
      try {
        await onConfirm()
      } catch (err) {
        console.error('Lỗi khi thực thi onConfirm callback:', err)
      }
    }
    if (resolve) resolve(true)
    set({ resolve: null, onConfirm: null, onCancel: null })
  },

  handleCancel: () => {
    const { onCancel, resolve } = get()
    set({ isOpen: false })
    if (onCancel) {
      try {
        onCancel()
      } catch (err) {
        console.error('Lỗi khi thực thi onCancel callback:', err)
      }
    }
    if (resolve) resolve(false)
    set({ resolve: null, onConfirm: null, onCancel: null })
  },
}))

export const confirmDialog = (options) => useConfirmStore.getState().openConfirm(options)

export const alertDialog = (options) => {
  if (typeof options === 'string') {
    return useConfirmStore.getState().openConfirm({
      title: 'Thông báo',
      message: options,
      confirmText: 'Đã hiểu',
      cancelText: null,
      variant: 'warning',
    })
  }
  return useConfirmStore.getState().openConfirm({
    title: options?.title || 'Thông báo',
    message: options?.message || '',
    confirmText: options?.confirmText || 'Đã hiểu',
    cancelText: null,
    variant: options?.variant || 'warning',
  })
}
