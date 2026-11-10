import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

const isHttps = process.env.HTTPS === 'true'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production' || process.env.NODE_ENV === 'production'

  return {
    plugins: [
      react(),
      ...(isHttps ? [basicSsl()] : [])
    ],
    esbuild: {
      // Remove console.log and debugger in production builds for cleaner bundle & performance
      drop: isProduction ? ['console', 'debugger'] : []
    },
    build: {
      target: 'es2020',
      outDir: 'dist',
      assetsDir: 'assets',
      minify: 'esbuild',
      cssCodeSplit: true,
      sourcemap: false,
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js',
          assetFileNames: (assetInfo) => {
            const name = assetInfo.name || ''
            if (/\.(css)$/i.test(name)) {
              return 'assets/css/[name]-[hash][extname]'
            }
            if (/\.(png|jpe?g|gif|svg|webp|ico)$/i.test(name)) {
              return 'assets/images/[name]-[hash][extname]'
            }
            if (/\.(woff2?|eot|ttf|otf)$/i.test(name)) {
              return 'assets/fonts/[name]-[hash][extname]'
            }
            return 'assets/[ext]/[name]-[hash][extname]'
          },
          manualChunks(id) {
            if (id.includes('node_modules')) {
              // React core & routing
              if (
                id.includes('node_modules/react/') ||
                id.includes('node_modules/react-dom/') ||
                id.includes('node_modules/react-router') ||
                id.includes('node_modules/react-router-dom')
              ) {
                return 'vendor-react'
              }

              // Lucide icons
              if (id.includes('node_modules/lucide-react')) {
                return 'vendor-icons'
              }

              // QR Code scanner (heavy)
              if (id.includes('node_modules/html5-qrcode')) {
                return 'vendor-qrcode'
              }

              // PayOS Checkout SDK
              if (id.includes('node_modules/@payos')) {
                return 'vendor-payos'
              }

              // Common state & utility libraries
              if (
                id.includes('node_modules/zustand') ||
                id.includes('node_modules/axios') ||
                id.includes('node_modules/clsx') ||
                id.includes('node_modules/tailwind-merge')
              ) {
                return 'vendor-utils'
              }

              return 'vendor-libs'
            }
          }
        }
      }
    },
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
  }
})
