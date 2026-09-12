import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/media': {
        target: process.env.VITE_API_BASE_URL || 'https://localhost:7045',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/media/, ''),
      },
    },
  },
  preview: { port: 4173, strictPort: true },
})
