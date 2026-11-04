import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    basicSsl()
  ],
  server: {
    port: 5173,
    host: true,
    https: true,
    proxy: {
      // SSE Live seats stream directly to enrollment-service (bypass blocking proxy)
      '/api/v1/student/class-sections/live-seats': {
        target: 'http://localhost:8083',
        changeOrigin: true,
      },
      // Lecturer Portal → lecturer-service:8085  (⚠️ phải đứng trước /api catch-all)
      '/api/v1/lecturer': {
        target: 'http://localhost:8085',
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

