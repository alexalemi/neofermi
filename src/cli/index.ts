/**
 * NeoFermi Notebook CLI
 *
 * Serves markdown files as live-updating notebooks with NeoFermi code execution.
 */

import { program } from 'commander'
import { resolve, basename } from 'path'
import { stat } from 'fs/promises'
import open from 'open'
import { createServer } from './server.js'
import { watchFiles, findMostRecentMdFile } from './watcher.js'
import { processMarkdown } from './processor.js'

interface NotebookState {
  currentFile: string | null
  html: string
}

const state: NotebookState = {
  currentFile: null,
  html: '<p>No markdown file loaded</p>',
}

async function run(inputPath: string, options: { port: string; open: boolean }) {
  const resolvedPath = resolve(inputPath)
  const port = parseInt(options.port, 10)

  // Check if path exists
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

program
  .name('neoferminb')
  .description('NeoFermi notebook server - live markdown with calculations')
  .argument('[path]', 'Markdown file or directory to serve', '.')
  .option('-p, --port <number>', 'Port number', '3000')
  .option('--no-open', 'Do not open browser automatically')
  .action(run)

program.parse()
