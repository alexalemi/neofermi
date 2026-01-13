/**
 * NeoFermi Notebook CLI
 *
 * Serves markdown files as live-updating notebooks with NeoFermi code execution.
 */

import { program } from 'commander'
import { resolve, basename, dirname } from 'path'
import { stat, writeFile, mkdir } from 'fs/promises'
import { createInterface } from 'readline'
// Dynamic import for ESM-only package (needed for CJS bundle compatibility)
const openBrowser = async (url: string) => {
  const open = (await import('open')).default
  return open(url)
}
import { createServer, wrapInStaticHtml } from './server.js'
import { watchFiles, findMostRecentMdFile } from './watcher.js'
import { processMarkdown } from './processor.js'
import { parse, Evaluator } from '../parser/index.js'
import type { Quantity } from '../core/Quantity.js'

/**
 * Format a Quantity for REPL display, including dimension name
 */
function formatQuantity(q: Quantity): string {
  const unit = q.unit.toString()
  const dimName = q.dimensionName?.() || null
  const dimSuffix = dimName && dimName !== 'dimensionless' ? ` {${dimName}}` : ''

  if (q.isScalar()) {
    const value = q.value as number
    return `${formatValue(value)} ${unit}${dimSuffix}`
  }

  // For distributions, show summary statistics with 68% CI (1 sigma)
  const mean = q.mean()
  const p16 = q.percentile(0.16)
  const p84 = q.percentile(0.84)
  return `${formatValue(mean)} [${formatValue(p16)}, ${formatValue(p84)}] ${unit}${dimSuffix}`
}

/**
 * Format a number for display with sensible precision
 */
function formatValue(n: number): string {
  if (!isFinite(n)) return String(n)

  const abs = Math.abs(n)

  // Very small or very large numbers use exponential
  if (abs > 0 && (abs < 0.001 || abs >= 1e6)) {
    return n.toExponential(2)
  }

  // Numbers close to integers
  if (Math.abs(n - Math.round(n)) < 0.0001) {
    return Math.round(n).toString()
  }

  // Regular decimals with reasonable precision
  if (abs >= 100) {
    return n.toFixed(1)
  } else if (abs >= 10) {
    return n.toFixed(2)
  } else if (abs >= 1) {
    return n.toFixed(3)
  } else {
    return n.toFixed(4)
  }
}

interface NotebookState {
  currentFile: string | null
  html: string
}

const state: NotebookState = {
  currentFile: null,
  html: '<p>No markdown file loaded</p>',
}

async function runStatic(inputPath: string, outputPath: string, darkMode: boolean) {
  const resolvedInput = resolve(inputPath)
  const resolvedOutput = resolve(outputPath)

  try {
    const stats = await stat(resolvedInput)
    if (stats.isDirectory()) {
      console.error('Error: Static output requires a single markdown file, not a directory')
      process.exit(1)
    }

    console.log(`Processing: ${resolvedInput}`)
    const html = await processMarkdown(resolvedInput)
    const title = basename(resolvedInput, '.md')
    const fullHtml = wrapInStaticHtml(html, title, darkMode)

    // Ensure output directory exists
    await mkdir(dirname(resolvedOutput), { recursive: true })
    await writeFile(resolvedOutput, fullHtml, 'utf-8')

    console.log(`Written: ${resolvedOutput}`)
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      console.error(`Error: File not found: ${resolvedInput}`)
    } else {
      console.error(`Error: ${(err as Error).message}`)
    }
    process.exit(1)
  }
}

async function runServer(inputPath: string, options: { port: string; host: string; open: boolean }) {
  const resolvedPath = resolve(inputPath)
  const port = parseInt(options.port, 10)
  const host = options.host

  try {
    const stats = await stat(resolvedPath)
    const isDirectory = stats.isDirectory()

    // Determine initial file
    if (isDirectory) {
      const mostRecent = await findMostRecentMdFile(resolvedPath)
      if (mostRecent) {
        state.currentFile = mostRecent
      } else {
        console.error('No markdown files found in directory')
        process.exit(1)
      }
    } else {
      state.currentFile = resolvedPath
    }

    // Initial render
    if (state.currentFile) {
      console.log(`Processing: ${state.currentFile}`)
      state.html = await processMarkdown(state.currentFile)
    }

    // Create server
    const { notifyReload, start } = createServer(port, host, () => ({
      html: state.html,
      title: state.currentFile ? basename(state.currentFile, '.md') : 'NeoFermi Notebook',
    }))

    // Watch for changes
    await watchFiles(resolvedPath, async (changedPath) => {
      console.log(`Changed: ${changedPath}`)
      state.currentFile = changedPath
      state.html = await processMarkdown(changedPath)
      notifyReload()
    })

    // Start server
    start()
    const displayHost = host === '0.0.0.0' ? 'localhost' : host
    const url = `http://${displayHost}:${port}`
    console.log(`\nNeoFermi Notebook running at ${url}`)
    if (host === '0.0.0.0') {
      console.log(`  (accessible on all network interfaces)`)
    }
    console.log('Watching for changes... (Ctrl+C to stop)\n')

    if (options.open) {
      await openBrowser(url)
    }
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      console.error(`Error: Path not found: ${resolvedPath}`)
    } else {
      console.error(`Error: ${(err as Error).message}`)
    }
    process.exit(1)
  }
}

async function runRepl() {
  const evaluator = new Evaluator()

  console.log('NeoFermi Interactive REPL')
  console.log('Type expressions to evaluate. Use Ctrl+D or "exit" to quit.\n')
  console.log('Examples:')
  console.log('  10 to 100           # lognormal distribution')
  console.log('  50 +/- 10 kg        # normal with units')
  console.log('  x = 1 to 10 m       # assign to variable')
  console.log('  x * 2               # use variable')
  console.log('')

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '> ',
  })

  rl.prompt()

  rl.on('line', (line) => {
    const input = line.trim()

    if (input === 'exit' || input === 'quit') {
      rl.close()
      return
    }

    if (input === 'help') {
      console.log('\nCommands:')
      console.log('  help     - Show this help')
      console.log('  vars     - List defined variables')
      console.log('  clear    - Clear all variables')
      console.log('  exit     - Exit REPL\n')
      console.log('Syntax:')
      console.log('  10 to 100        - Lognormal (90% CI)')
      console.log('  50 +/- 10        - Normal (mean ± std)')
      console.log('  uniform(0, 1)    - Uniform distribution')
      console.log('  poisson(5)       - Poisson distribution')
      console.log('  x = expr         - Assign variable')
      console.log('  f(a, b) = expr   - Define function\n')
      rl.prompt()
      return
    }

    if (input === 'vars') {
      const vars = evaluator.getUserVariableNames()
      if (vars.length === 0) {
        console.log('No variables defined\n')
      } else {
        console.log('Variables:', vars.join(', '), '\n')
      }
      rl.prompt()
      return
    }

    if (input === 'clear') {
      evaluator.clearVariables()
      console.log('Variables cleared\n')
      rl.prompt()
      return
    }

    if (input === '') {
      rl.prompt()
      return
    }

    try {
      const result = parse(input, evaluator)
      if (result !== null) {
        console.log(formatQuantity(result))
        console.log('')
      }
    } catch (err) {
      console.error(`Error: ${(err as Error).message}\n`)
    }

    rl.prompt()
  })

  rl.on('close', () => {
    console.log('\nGoodbye!')
    process.exit(0)
  })
}

async function run(inputPath: string | undefined, options: { port: string; host: string; open: boolean; output?: string; repl?: boolean; dark?: boolean }) {
  if (options.repl) {
    await runRepl()
  } else if (options.output && inputPath) {
    await runStatic(inputPath, options.output, options.dark ?? false)
  } else if (inputPath) {
    await runServer(inputPath, options)
  } else {
    // No path given and no --repl, default to current directory
    await runServer('.', options)
  }
}

program
  .name('neoferminb')
  .description('NeoFermi notebook server - live markdown with calculations')
  .argument('[path]', 'Markdown file or directory to serve')
  .option('-p, --port <number>', 'Port number', '3000')
  .option('-H, --host <address>', 'Host to bind to (use 0.0.0.0 for all interfaces)', 'localhost')
  .option('-o, --output <file>', 'Render to static HTML file instead of serving')
  .option('-d, --dark', 'Use dark mode theme (default is light mode)')
  .option('-r, --repl', 'Start interactive REPL mode')
  .option('--no-open', 'Do not open browser automatically')
  .action(run)

program.parse()
