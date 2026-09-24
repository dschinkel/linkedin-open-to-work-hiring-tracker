import path from 'node:path'
import react from '@vitejs/plugin-react'
import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
      '@contracts': path.resolve(import.meta.dirname, './contracts'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    exclude: [...configDefaults.exclude, 'redesign/**'],
  },
})
