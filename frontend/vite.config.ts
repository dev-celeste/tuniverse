import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // The 3D scene chunk is mostly three.js (~1 MB, ~280 kB gzipped). It already loads lazily,
    // after the page, so there's nothing to gain by splitting it further.
    chunkSizeWarningLimit: 1100,
  },
  server: {
    // 127.0.0.1, not localhost: cookies are scoped by host, and the backend + Spotify
    // redirect URI use 127.0.0.1. See docs/DEPLOYMENT.md.
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    // Same-origin API calls, so the session cookie stays first-party (no CORS needed)
    proxy: {
      '/api': { target: 'http://127.0.0.1:8000' },
    },
  },
})
