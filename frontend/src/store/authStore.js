import { create } from 'zustand'

const storedToken = localStorage.getItem('eduportal_token')
const storedRefreshToken = localStorage.getItem('eduportal_refresh_token')
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
  refreshToken: storedRefreshToken,
  isAuthenticated: !!storedToken,

  login: (userData, token, refreshToken = null) => {
    localStorage.setItem('eduportal_token', token)
    if (refreshToken) {
      localStorage.setItem('eduportal_refresh_token', refreshToken)
    }
    localStorage.setItem('eduportal_user', JSON.stringify(userData))
    set({
      user: userData,
      token,
      refreshToken: refreshToken || null,
      isAuthenticated: true,
    })
  },

  setTokens: (token, refreshToken) => {
    localStorage.setItem('eduportal_token', token)
    if (refreshToken) {
      localStorage.setItem('eduportal_refresh_token', refreshToken)
    }
    set((state) => ({
      ...state,
      token,
      refreshToken: refreshToken || state.refreshToken,
    }))
  },

  logout: () => {
    const refreshToken = localStorage.getItem('eduportal_refresh_token')
    if (refreshToken) {
      try {
        const baseURL = import.meta.env.VITE_API_BASE_URL || '/api/v1'
        fetch(baseURL + '/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        }).catch(() => {})
      } catch (e) {
        // ignore
      }
    }
    localStorage.removeItem('eduportal_token')
    localStorage.removeItem('eduportal_refresh_token')
    localStorage.removeItem('eduportal_user')
    set({
      user: null,
      token: null,
      refreshToken: null,
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
