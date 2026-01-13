import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  base: '/', // Custom domain: neofermi.alexalemi.com
  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'es2020',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        editor: resolve(__dirname, 'editor.html')
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
