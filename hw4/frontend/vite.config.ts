import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// The FastAPI backend (backend/main.py) runs on :8000. Proxying /api, /media,
// and /chat keeps the frontend on relative URLs (and same-origin cookies), e.g.
// the database's image paths are served as /media/products/<id>.jpg.
const BACKEND_URL = 'http://127.0.0.1:8000'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': BACKEND_URL,
      '/media': BACKEND_URL,
      '/chat': BACKEND_URL,
    },
  },
})
