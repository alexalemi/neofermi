/**
 * NeoFermi Notebook CLI
 *
 * Serves markdown files as live-updating notebooks with NeoFermi code execution.
 */

import { program } from 'commander'
import { resolve, basename, dirname, join } from 'path'
import { stat, readFile, writeFile, mkdir } from 'fs/promises'
import { readFileSync, appendFileSync } from 'fs'
import { homedir } from 'os'
import { createInterface } from 'readline'
// Dynamic import for ESM-only package (needed for CJS bundle compatibility)
const openBrowser = async (url: string) => {
  const open = (await import('open')).default
  return open(url)
}
import { annotateMarkdown } from './annotate.js'
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
  ALL_COMPLETIONS,
  type Completion,
} from '../autocomplete/completions.js'
import { SYNTAX_HELP } from '../help/syntax.js'
import { getKnownUnitNames } from '../core/unitUtils.js'

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

async function runAnnotate(inputPath: string, options: { output?: string }) {
  const resolvedInput = resolve(inputPath)
  // The root command also defines -o/--output (static render) and, as a
  // global option, it captures the flag even when passed after `annotate`.
  const resolvedOutput = resolve(options.output ?? program.opts().output ?? inputPath)
  try {
    const source = await readFile(resolvedInput, 'utf-8')
    const { content, blockCount, inlineCount, warnings } = annotateMarkdown(source)
    for (const w of warnings) {
      console.error(`Warning: ${w}`)
    }
    await writeFile(resolvedOutput, content, 'utf-8')
    console.log(
      `Annotated ${resolvedOutput}: ${blockCount} code block${blockCount === 1 ? '' : 's'}, ` +
        `${inlineCount} inline expression${inlineCount === 1 ? '' : 's'}` +
        (warnings.length ? `, ${warnings.length} warning${warnings.length === 1 ? '' : 's'}` : '')
    )
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      console.error(`Error: File not found: ${resolvedInput}`)
    } else {
      console.error(`Error: ${(err as Error).message}`)
    }
    process.exit(1)
  }
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

const HISTORY_FILE = join(homedir(), '.neofermi_history')
const HISTORY_LIMIT = 1000

/** Most-recent-first, as readline's `history` option expects. */
function loadHistory(): string[] {
  try {
    return readFileSync(HISTORY_FILE, 'utf-8').split('\n').filter(Boolean).slice(-HISTORY_LIMIT).reverse()
  } catch {
    return []
  }
}

const REPL_COMMANDS = ['help', 'vars', 'units', 'constants', 'functions', 'clear', 'exit', 'quit']

/**
 * Tab completion from the live registries — the evaluator's variable map
 * (constants + user variables), mathjs's unit registry, and the curated
 * function/keyword lists — rather than the hand-maintained completion
 * catalog, which lags behind what actually evaluates.
 */
function makeCompleter(evaluator: Evaluator) {
  return (line: string): [string[], string] => {
    const match = line.match(/[A-Za-z_][A-Za-z0-9_]*$/)
    const prefix = match ? match[0] : ''
    const candidates = [
      // Meta-commands only complete at the start of the line
      ...(prefix === line.trimStart() ? REPL_COMMANDS : []),
      ...ALL_COMPLETIONS.map((c) => c.label),
      ...evaluator.getVariableNames(),
      ...getKnownUnitNames(),
    ]
    const hits = [...new Set(candidates)].filter((name) => name.startsWith(prefix)).sort()
    return [hits, prefix]
  }
}

async function runRepl() {
  const evaluator = new Evaluator()
  // IPython-style history: inputs are numbered, and each result is bound to
  // `_` (most recent) and `_N` (result of input N).
  let inputNum = 1

  console.log('NeoFermi Interactive REPL')
  console.log('Type expressions to evaluate. Use Ctrl+D or "exit" to quit.\n')
  console.log('Examples:')
  console.log('  10 to 100           # lognormal distribution')
  console.log('  50 +/- 10 kg        # normal with units')
  console.log('  x = 1 to 10 m       # assign to variable')
  console.log('  x * 2               # use variable')
  console.log('  _ * 2               # _ is the last result, _3 the result of input 3')
  console.log('')

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: `[${inputNum}]> `,
    completer: makeCompleter(evaluator),
    history: loadHistory(),
    historySize: HISTORY_LIMIT,
  })

  rl.prompt()

  let lastSaved: string | null = null
  rl.on('line', (line) => {
    const input = line.trim()

    // Only record interactive sessions — piped input would pollute history.
    if (process.stdin.isTTY && input && input !== lastSaved) {
      try {
        appendFileSync(HISTORY_FILE, input + '\n')
        lastSaved = input
      } catch {
        // History is best-effort; never break the REPL over it.
      }
    }

    if (input === 'exit' || input === 'quit') {
      rl.close()
      return
    }

    if (input === 'help') {
      console.log('\nCommands:')
      console.log('  help       - Show this help')
      console.log('  vars       - List defined variables')
      console.log('  _, _N      - Last result / result of input N')
      console.log('  units      - List built-in units')
      console.log('  constants  - List built-in constants')
      console.log('  functions  - List built-in functions')
      console.log('  clear      - Clear all variables')
      console.log('  exit       - Exit REPL\n')
      for (const section of SYNTAX_HELP) {
        console.log(`${section.title}:`)
        const width = Math.min(28, Math.max(...section.entries.map((e) => e.code.length)))
        for (const e of section.entries) {
          console.log(`  ${e.code.padEnd(width)}  - ${e.note}`)
        }
        console.log('')
      }
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
      // Hide the _/_N history bindings; they'd swamp the user's own names.
      const vars = evaluator.getUserVariableNames().filter((name) => !/^_\d*$/.test(name))
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
        evaluator.setVariable('_', result)
        evaluator.setVariable(`_${inputNum}`, result)
        console.log(
          `${colorize('dim', `[${inputNum}]`)} ${formatQuantityConcise(result, { decorate: colorize })}`
        )
        console.log('')
      }
    } catch (err) {
      const message = (err as Error).message
      // Point at the offending column of the (single-line) input, aligned
      // under the echoed line: prompt width + any leading whitespace trimmed
      // from `input` before parsing.
      const pos = message.match(/line 1, column (\d+)/)
      if (pos) {
        const offset = `[${inputNum}]> `.length + (line.length - line.trimStart().length) + Number(pos[1]) - 1
        console.error(`${' '.repeat(offset)}${colorize('error', '^')}`)
      }
      console.error(`${colorize('error', 'Error:')} ${message}\n`)
    }

    // Errors consume an input number too (matching IPython), so [N] in the
    // scrollback always identifies the same exchange.
    inputNum++
    rl.setPrompt(`[${inputNum}]> `)
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

program
  .command('annotate')
  .description('Compute results and write them into the markdown itself (idempotent, seeded)')
  .argument('<file>', 'Markdown notebook to annotate')
  .option('-o, --output <file>', 'Write to a different file instead of in place')
  .action(runAnnotate)

program.parse()
