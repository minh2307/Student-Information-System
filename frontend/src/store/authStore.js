import { create } from 'zustand'

const storedToken = localStorage.getItem('eduportal_token')
let storedUser = null
try {
  const item = localStorage.getItem('eduportal_user')
  if (item) storedUser = JSON.parse(item)
} catch (e) {
  console.error('Error parsing stored user', e)
}

export const useAuthStore = create((set) => ({
  user: storedUser,
  token: storedToken,
  isAuthenticated: !!storedToken,

  login: (userData, token) => {
    localStorage.setItem('eduportal_token', token)
    localStorage.setItem('eduportal_user', JSON.stringify(userData))
    set({
      user: userData,
      token,
      isAuthenticated: true,
    })
  },

  logout: () => {
    localStorage.removeItem('eduportal_token')
    localStorage.removeItem('eduportal_user')
    set({
      user: null,
      token: null,
      isAuthenticated: false,
    })
  },

  updateUser: (updatedData) => {
    set((state) => {
      const newUser = { ...state.user, ...updatedData }
      localStorage.setItem('eduportal_user', JSON.stringify(newUser))
      return { user: newUser }
    })
  },
}))
