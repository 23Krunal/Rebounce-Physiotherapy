import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const workspaceRoot = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    rollupOptions: {
      input: {
        main: resolve(workspaceRoot, 'index.html'),
        homeVisit: resolve(workspaceRoot, 'home-physiotherapy.html'),
        onlinePhysiotherapy: resolve(workspaceRoot, 'online-physiotherapy.html'),
      },
    },
  },
  server: {
    port: 5173,
    proxy: { '/api': { target: 'http://localhost:4001', changeOrigin: true } },
  },
})
