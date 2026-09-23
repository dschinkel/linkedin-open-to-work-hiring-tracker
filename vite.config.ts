import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { mockApiPlugin } from './mock-api/mockApiPlugin.ts'

export default defineConfig({
  // GitHub Pages serves the static demo from /<repo>/; local dev stays at /.
  base: process.env.PAGES_BASE ?? '/',
  plugins: [react(), tailwindcss(), mockApiPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
      '@contracts': path.resolve(import.meta.dirname, './contracts'),
    },
  },
})
