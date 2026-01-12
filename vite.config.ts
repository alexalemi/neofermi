import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  base: '/neofermi/', // GitHub Pages base path (change to '/' when using custom domain)
  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'es2020',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html')
      }
    }
  },
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html']
    }
  }
})
