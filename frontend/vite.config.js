import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // FastAPI serves routes under /api/v1/...
      '/api': {
        target:
          process.env.BACKEND_ORIGIN ?? 'http://127.0.0.1:8001',
        changeOrigin: true,
      },
    },
  },
})
