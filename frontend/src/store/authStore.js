import { create } from 'zustand'

// Decoupled Auth Event Emitter (SOLID - Dependency Inversion Principle)
const authSubscribers = new Set()

export const subscribeAuth = (callback) => {
  if (typeof callback === 'function') {
    authSubscribers.add(callback)
    return () => authSubscribers.delete(callback)
  }
  return () => {}
}

const notifyAuthSubscribers = (event, data = null) => {
  authSubscribers.forEach((cb) => {
    try {
      cb(event, data)
    } catch (err) {
      console.warn('Error in auth subscriber callback', err)
    }
  })
}

const isHybridMode = () => typeof window !== 'undefined' && Boolean(window.ReactNativeWebView)

const isInitialHybrid = typeof window !== 'undefined' && Boolean(window.ReactNativeWebView)
if (isInitialHybrid && typeof localStorage !== 'undefined') {
  try {
    localStorage.removeItem('eduportal_refresh_token')
    localStorage.removeItem('eduportal_token')
    localStorage.removeItem('eduportal_user')
  } catch {}
}
const storedToken = !isInitialHybrid && typeof localStorage !== 'undefined' ? localStorage.getItem('eduportal_token') : null
const storedRefreshToken = !isInitialHybrid && typeof localStorage !== 'undefined' ? localStorage.getItem('eduportal_refresh_token') : null
let storedUser = null
try {
  const item = !isInitialHybrid && typeof localStorage !== 'undefined' ? localStorage.getItem('eduportal_user') : null
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
    if (typeof localStorage !== 'undefined' && !isHybridMode()) {
      localStorage.setItem('eduportal_token', token)
      if (refreshToken) {
        localStorage.setItem('eduportal_refresh_token', refreshToken)
      }
      localStorage.setItem('eduportal_user', JSON.stringify(userData))
    }
    set({
      user: userData,
      token,
      refreshToken: isHybridMode() ? null : (refreshToken || null),
      isAuthenticated: true,
    })
    notifyAuthSubscribers('LOGIN', userData)
  },

  setTokens: (token, refreshToken = null) => {
    if (typeof localStorage !== 'undefined' && !isHybridMode()) {
      localStorage.setItem('eduportal_token', token)
      if (refreshToken) {
        localStorage.setItem('eduportal_refresh_token', refreshToken)
      }
    }
    set((state) => ({
      ...state,
      token,
      refreshToken: isHybridMode() ? null : (refreshToken || state.refreshToken),
    }))
  },

  logout: () => {
    if (isHybridMode()) {
      if (typeof window !== 'undefined' && window.__EDUPORTAL_HYBRID_BRIDGE__) {
        try {
          window.__EDUPORTAL_HYBRID_BRIDGE__.requestLogout()
        } catch {}
      }
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('eduportal_token')
        localStorage.removeItem('eduportal_refresh_token')
        localStorage.removeItem('eduportal_user')
      }
      set({
        user: null,
        token: null,
        refreshToken: null,
        isAuthenticated: false,
      })
      notifyAuthSubscribers('LOGOUT', null)
      return
    }

    const refreshToken = typeof localStorage !== 'undefined' ? localStorage.getItem('eduportal_refresh_token') : null
    if (refreshToken) {
      try {
        const baseURL = import.meta.env?.VITE_API_BASE_URL || '/api/v1'
        fetch(baseURL + '/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        }).catch(() => {})
      } catch (e) {
        // ignore
      }
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('eduportal_token')
      localStorage.removeItem('eduportal_refresh_token')
      localStorage.removeItem('eduportal_user')
    }
    set({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
    })
    notifyAuthSubscribers('LOGOUT', null)
  },

  updateUser: (updatedData) => {
    set((state) => {
      const newUser = { ...state.user, ...updatedData }
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('eduportal_user', JSON.stringify(newUser))
      }
      return { user: newUser }
    })
  },
}))
