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
import { formatQuantityConcise, type FormatPart } from '../utils/format.js'
import {
  DISTRIBUTION_FUNCTIONS,
  MATH_FUNCTIONS,
  CONSTANTS,
  UNITS,
  type Completion,
} from '../autocomplete/completions.js'

interface NotebookState {
  currentFile: string | null
  html: string
}

const state: NotebookState = {
  currentFile: null,
  html: '<p>No markdown file loaded</p>',
}

const STARTER_NOTEBOOK = `# My First Estimate

How far does a car travel in a typical road trip?

## Assumptions

\`\`\`
speed = 60 to 120 km/hr      # highway speeds, lognormal 68% CI
time = 2 to 6 hours          # a day's drive
\`\`\`

## Calculation

\`\`\`
distance = speed * time
\`\`\`

## Result

The trip covers about \${distance}, or \${distance as miles}.

Edit this file and save — the notebook reloads live. See the syntax
reference at https://neofermi.alexalemi.com/ (Help button).
`

async function runInit(filename: string) {
  const resolvedPath = resolve(filename)
  try {
    await stat(resolvedPath)
    console.error(`Error: ${filename} already exists — refusing to overwrite`)
    process.exit(1)
  } catch {
    // Doesn't exist — good.
  }
  await mkdir(dirname(resolvedPath), { recursive: true })
  await writeFile(resolvedPath, STARTER_NOTEBOOK, 'utf-8')
  console.log(`Created ${filename}`)
  console.log(`Run: neoferminb ${filename}`)
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
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    console.error(`Error: invalid port '${options.port}'`)
    process.exit(1)
  }
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
        console.error('Create a starter notebook with: neoferminb init')
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

    // Watch for changes. Renders are serialized so a slow render of one file
    // can't finish after a newer one and clobber it, and errors are caught —
    // an unhandled rejection (e.g. the file vanishing mid-save) would
    // otherwise take down the whole server.
    let renderChain = Promise.resolve()
    await watchFiles(resolvedPath, (changedPath) => {
      renderChain = renderChain
        .then(async () => {
          console.log(`Changed: ${changedPath}`)
          const html = await processMarkdown(changedPath)
          state.currentFile = changedPath
          state.html = html
          notifyReload()
        })
        .catch((err) => {
          console.error(`Error processing ${changedPath}: ${(err as Error).message}`)
        })
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

// REPL colors, following qalc's scheme: numbers cyan, units green.
// Respects NO_COLOR (https://no-color.org) and non-TTY output; FORCE_COLOR overrides.
const useColor =
  process.env.NO_COLOR === undefined && (process.stdout.isTTY || process.env.FORCE_COLOR !== undefined)

const ANSI = {
  scalar: '\x1b[0;36m', // cyan
  unit: '\x1b[0;32m', // green
  ci: '\x1b[2m', // dim
  dim: '\x1b[2m', // dim
  error: '\x1b[0;31m', // red
  reset: '\x1b[0m',
}

function colorize(part: FormatPart | 'error', text: string): string {
  return useColor ? `${ANSI[part]}${text}${ANSI.reset}` : text
}

function printCatalog(title: string, entries: Completion[]) {
  console.log(`\n${title}:`)
  const width = Math.max(...entries.map((e) => (e.signature ?? e.label).length))
  for (const e of entries) {
    const name = (e.signature ?? e.label).padEnd(width)
    const part = e.type === 'unit' ? 'unit' : 'scalar'
    console.log(`  ${colorize(part, name)}  ${colorize('dim', e.description ?? '')}`)
  }
  console.log('')
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
      console.log('  help       - Show this help')
      console.log('  vars       - List defined variables')
      console.log('  units      - List built-in units')
      console.log('  constants  - List built-in constants')
      console.log('  functions  - List built-in functions')
      console.log('  clear      - Clear all variables')
      console.log('  exit       - Exit REPL\n')
      console.log('Distributions:')
      console.log('  10 to 100        - Lognormal (68% CI)')
      console.log('  1 .. 10          - Uniform')
      console.log('  50 +/- 10        - Normal (mean ± sigma)')
      console.log('  3 of 10          - Beta (successes/trials)')
      console.log('  1 to 2 million   - Scale-word rebalance')
      console.log('  100 * 10%        - Twiddle by ±10%')
      console.log('  uniform/normal/poisson/gamma/exponential/binomial/lognormal(...)\n')
      console.log('Units:')
      console.log('  100 m as feet            - Convert')
      console.log('  98.6 degF as degC        - Affine temperature')
      console.log('  1 feet / 1 mm as feet/mm - Keep ratio in compound form')
      console.log('  1 \'widget = 5 kg         - Define custom unit')
      console.log('  Catalog: SI, calorie/kcal, parsec/ly, barn, knot, atm, hp,')
      console.log('           USD/EUR/GBP/JPY/... (12 currencies),')
      console.log('           dollars_1960 … dollars_2026 (inflation-adjusted)\n')
      console.log('Dates:')
      console.log('  #2026-04-16#                 - Date literal')
      console.log('  #2027-01-01# - #2026-01-01#  - Duration (365 day)\n')
      console.log('Bindings:')
      console.log('  x = expr         - Assign variable')
      console.log('  f(a, b) = expr   - Define function\n')
      rl.prompt()
      return
    }

    if (input === 'units') {
      printCatalog('Units', UNITS)
      rl.prompt()
      return
    }

    if (input === 'constants') {
      printCatalog('Constants', CONSTANTS)
      rl.prompt()
      return
    }

    if (input === 'functions') {
      printCatalog('Distribution functions', DISTRIBUTION_FUNCTIONS)
      printCatalog('Math functions', MATH_FUNCTIONS)
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
        console.log(formatQuantityConcise(result, { decorate: colorize }))
        console.log('')
      }
    } catch (err) {
      console.error(`${colorize('error', 'Error:')} ${(err as Error).message}\n`)
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
  } else if (options.output) {
    if (!inputPath) {
      console.error('Error: --output requires an input markdown file')
      process.exit(1)
    }
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
  .argument('[path]', 'Markdown file or directory to serve (watches for changes)')
  .option('-p, --port <number>', 'Port number', '3000')
  .option('-H, --host <address>', 'Host to bind to (use 0.0.0.0 for all interfaces)', 'localhost')
  .option('-o, --output <file>', 'Render to static HTML file instead of serving')
  .option('-d, --dark', 'Use dark mode theme (default is light mode)')
  .option('-r, --repl', 'Start interactive REPL mode')
  .option('--no-open', 'Do not open browser automatically')
  .action(run)

program
  .command('init')
  .description('Create a starter notebook to build on')
  .argument('[filename]', 'Notebook file to create', 'notebook.md')
  .action(runInit)

program.parse()
