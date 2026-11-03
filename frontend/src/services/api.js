import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor: attach token
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor: handle 401 unauthorized & refresh token
let isRefreshing = false
let failedQueue = []

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })
  failedQueue = []
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response && error.response.status === 401 && originalRequest && !originalRequest._retry) {
      const isAuthEndpoint = originalRequest.url?.includes('/auth/login') || originalRequest.url?.includes('/auth/refresh')
      const refreshToken = useAuthStore.getState().refreshToken || localStorage.getItem('eduportal_refresh_token')

      if (isAuthEndpoint || !refreshToken) {
        useAuthStore.getState().logout()
        if (window.location.pathname !== '/login') {
          window.location.href = '/login'
        }
        return Promise.reject(error)
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then((newToken) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`
            return api(originalRequest)
          })
          .catch((err) => Promise.reject(err))
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const baseURL = import.meta.env.VITE_API_BASE_URL || '/api/v1'
        const response = await axios.post(`${baseURL}/auth/refresh`, {
          refreshToken,
        })
        const data = response.data?.data
        if (data?.accessToken) {
          useAuthStore.getState().setTokens(data.accessToken, data.refreshToken)
          processQueue(null, data.accessToken)
          originalRequest.headers.Authorization = `Bearer ${data.accessToken}`
          return api(originalRequest)
        } else {
          throw new Error('Refresh token invalid response')
        }
      } catch (refreshErr) {
        processQueue(refreshErr, null)
        useAuthStore.getState().logout()
        if (window.location.pathname !== '/login') {
          window.location.href = '/login'
        }
        return Promise.reject(refreshErr)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

export default api
