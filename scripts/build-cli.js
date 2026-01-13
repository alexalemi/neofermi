/**
 * Build script for NeoFermi CLI binary
 *
 * Bundles the CLI into a single executable file.
 */

import { build } from 'esbuild'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = resolve(__dirname, '..')

async function buildCli() {
  console.log('Building NeoFermi CLI...')

  try {
    await build({
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
    })

    console.log('CLI built successfully: bin/neoferminb.js')
  } catch (error) {
    console.error('Build failed:', error)
    process.exit(1)
  }
}

buildCli()
