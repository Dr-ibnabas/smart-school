import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3000,
    proxy: {
      '/api':     'http://localhost:3001',
      // Les fichiers servis par le backend (logos, tampons d'école…).
      // Sans ce proxy, <img src="/uploads/settings/xxx.png"> hit localhost:3000
      // au lieu de localhost:3001 et renvoie le HTML de l'app → image cassée.
      '/uploads': 'http://localhost:3001'
    }
  }
})
