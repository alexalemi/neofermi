/**
 * NeoFermi Notebook CLI
 *
 * Serves markdown files as live-updating notebooks with NeoFermi code execution.
 */

import { program } from 'commander'
import { resolve, basename, dirname } from 'path'
import { stat, writeFile, mkdir } from 'fs/promises'
import { createInterface } from 'readline'
import open from 'open'
import { createServer, wrapInStaticHtml } from './server.js'
import { watchFiles, findMostRecentMdFile } from './watcher.js'
import { processMarkdown } from './processor.js'
import { parse, Evaluator } from '../parser/index.js'

interface NotebookState {
  currentFile: string | null
  html: string
}

const state: NotebookState = {
  currentFile: null,
  html: '<p>No markdown file loaded</p>',
}

async function runStatic(inputPath: string, outputPath: string) {
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
    const fullHtml = wrapInStaticHtml(html, title)

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

async function runServer(inputPath: string, options: { port: string; open: boolean }) {
  const resolvedPath = resolve(inputPath)
  const port = parseInt(options.port, 10)

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
    const { notifyReload, start } = createServer(port, () => ({
      html: state.html,
      title: state.currentFile ? basename(state.currentFile, '.md') : 'NeoFermi Notebook',
    }))

    // Watch for changes
    const watchPattern = isDirectory ? resolvedPath : resolvedPath
    watchFiles(watchPattern, async (changedPath) => {
      console.log(`Changed: ${changedPath}`)
      state.currentFile = changedPath
      state.html = await processMarkdown(changedPath)
      notifyReload()
    })

    // Start server
    start()
    const url = `http://localhost:${port}`
    console.log(`\nNeoFermi Notebook running at ${url}`)
    console.log('Watching for changes... (Ctrl+C to stop)\n')

    if (options.open) {
      await open(url)
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
        console.log(result.toString())
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

async function run(inputPath: string | undefined, options: { port: string; open: boolean; output?: string; repl?: boolean }) {
  if (options.repl) {
    await runRepl()
  } else if (options.output && inputPath) {
    await runStatic(inputPath, options.output)
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
  .option('-o, --output <file>', 'Render to static HTML file instead of serving')
  .option('-r, --repl', 'Start interactive REPL mode')
  .option('--no-open', 'Do not open browser automatically')
  .action(run)

program.parse()
