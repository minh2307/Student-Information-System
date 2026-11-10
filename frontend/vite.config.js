import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

const isHttps = process.env.HTTPS === 'true'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    ...(isHttps ? [basicSsl()] : [])
  ],
  server: {
    port: 5173,
    host: true,
    https: isHttps,
    proxy: {
      // Direct SSE Stream for Real-time Live Seats (EDUP-204, bypass blocking gateway proxy)
      '/api/v1/student/class-sections/live-seats': {
        target: 'http://localhost:8083',
        changeOrigin: true,
      },
      '/api/v1/student/live-seats': {
        target: 'http://localhost:8083',
        changeOrigin: true,
      },
      // Lecturer Portal → lecturer-service:8085  (⚠️ phải đứng trước /api catch-all)
      '/api/v1/lecturer': {
        target: 'http://localhost:8085',
        changeOrigin: true,
      },
      // QR Attendance Check-in → lecturer-service:8085
      '/api/v1/student/attendance': {
        target: 'http://localhost:8085',
        changeOrigin: true,
      },
      '/api/v1/attendance': {
        target: 'http://localhost:8085',
        changeOrigin: true,
      },
      '/attendance': {
        target: 'http://localhost:8085',
        changeOrigin: true,
      },
      // Admin Exam Schedules → enrollment-service:8083
      '/api/v1/admin/exam-schedules': {
        target: 'http://localhost:8083',
        changeOrigin: true,
      },
      '/api/v1/admin/exams': {
        target: 'http://localhost:8083',
        changeOrigin: true,
      },
      // Tất cả API còn lại → api-gateway:8080
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      }
    }
  }
})
