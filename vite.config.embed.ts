import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'es2020',
    lib: {
      entry: resolve(__dirname, 'src/embed.ts'),
      name: 'NeoFermi',
      formats: ['iife'],
      fileName: () => 'neofermi-embed.js',
    },
    // Don't empty outDir — other builds put files there too
    emptyOutDir: false,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        // Ensure everything is in one file
        inlineDynamicImports: true,
      },
    },
  },
})
