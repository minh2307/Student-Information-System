import { create } from 'zustand'

export const useConfirmStore = create((set) => ({
  isOpen: false,
  title: '',
  message: '',
  confirmText: 'Xác nhận',
  cancelText: 'Hủy bỏ',
  variant: 'danger', // 'danger' | 'warning' | 'info'
  resolve: null,

  openConfirm: ({
    title = 'Xác nhận hành động',
    message = 'Bạn có chắc chắn muốn thực hiện hành động này?',
    confirmText = 'Xác nhận',
    cancelText = 'Hủy bỏ',
    variant = 'danger',
  }) => {
    return new Promise((resolve) => {
      set({
        isOpen: true,
        title,
        message,
        confirmText,
        cancelText,
        variant,
        resolve,
      })
    })
  },

  handleConfirm: () => {
    set((state) => {
      if (state.resolve) state.resolve(true)
      return { isOpen: false, resolve: null }
    })
  },

  handleCancel: () => {
    set((state) => {
      if (state.resolve) state.resolve(false)
      return { isOpen: false, resolve: null }
    })
  },
}))

export const confirmDialog = (options) => useConfirmStore.getState().openConfirm(options)
