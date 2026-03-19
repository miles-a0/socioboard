/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/setupTests.ts'],
    exclude: ['tests/**', 'node_modules/**']
  },
  server: {
    allowedHosts: ['kurtis-supereducated-deeanna.ngrok-free.dev'],
    watch: {
      usePolling: true
    }
  }
})
