/**
 * Build script for NeoFermi CLI binary
 *
 * Bundles the CLI into a single executable file.
 * Use --watch flag for development mode.
 */

import { build, context } from 'esbuild'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = resolve(__dirname, '..')

const watchMode = process.argv.includes('--watch')

const buildOptions = {
  entryPoints: [resolve(projectRoot, 'src/cli/index.ts')],
  bundle: true,
  platform: 'node',
  target: 'node18',
  outfile: resolve(projectRoot, 'bin/neoferminb.cjs'),
  format: 'cjs',
  banner: {
    js: '#!/usr/bin/env node',
  },
  external: [
    'fsevents',
    'open',
  ],
  minify: false,
  sourcemap: true,
}

async function buildCli() {
  if (watchMode) {
    console.log('Watching for changes...')
    const ctx = await context(buildOptions)
    await ctx.watch()
    console.log('CLI built. Watching for changes (Ctrl+C to stop)')
  } else {
    console.log('Building NeoFermi CLI...')
    try {
      await build(buildOptions)
      console.log('CLI built successfully: bin/neoferminb.cjs')
    } catch (error) {
      console.error('Build failed:', error)
      process.exit(1)
    }
  }
}

buildCli()
