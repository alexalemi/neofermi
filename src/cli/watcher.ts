/**
 * File watcher for markdown files
 */

import chokidar from 'chokidar'
import { stat, readdir } from 'fs/promises'
import { join } from 'path'

/**
 * Watch a file or directory for markdown file changes
 */
export async function watchFiles(path: string, onFileChange: (filePath: string) => void) {
  const isMarkdownFile = path.endsWith('.md')

  // For directories, find all .md files and watch them explicitly
  // (glob patterns don't work reliably with polling)
  let filesToWatch: string[]
  if (isMarkdownFile) {
    filesToWatch = [path]
  } else {
    filesToWatch = await findMdFilesRecursive(path)
    console.log(`Found ${filesToWatch.length} markdown files to watch`)
  }

  const watcher = chokidar.watch(filesToWatch, {
    ignored: /(^|[\/\\])\../, // Ignore dotfiles
    persistent: true,
    ignoreInitial: true,
    usePolling: true,
    interval: 300,
    awaitWriteFinish: {
      stabilityThreshold: 100,
      pollInterval: 50,
    },
  })

  // For directories, also watch for new .md files
  if (!isMarkdownFile) {
    const dirWatcher = chokidar.watch(path, {
      ignored: /(^|[\/\\])\../,
      persistent: true,
      ignoreInitial: true,
      usePolling: true,
      interval: 1000,
      depth: 10,
    })
    dirWatcher.on('add', (addedPath) => {
      if (addedPath.endsWith('.md')) {
        console.log(`New file detected: ${addedPath}`)
        watcher.add(addedPath)
        onFileChange(addedPath)
      }
    })
  }

  watcher
    .on('change', (changedPath) => {
      if (changedPath.endsWith('.md')) {
        onFileChange(changedPath)
      }
    })
    .on('error', (error) => {
      console.error('Watcher error:', error)
    })
    .on('ready', () => {
      console.log('Watcher ready')
    })

  return watcher
}

/**
 * Find the most recently modified markdown file in a directory
 */
export async function findMostRecentMdFile(dirPath: string): Promise<string | null> {
  const mdFiles = await findMdFilesRecursive(dirPath)

  if (mdFiles.length === 0) {
    return null
  }

  // Get modification times for all files
  const filesWithTimes = await Promise.all(
    mdFiles.map(async (filePath) => {
      const stats = await stat(filePath)
      return { filePath, mtime: stats.mtime.getTime() }
    })
  )

  // Sort by modification time (most recent first)
  filesWithTimes.sort((a, b) => b.mtime - a.mtime)

  return filesWithTimes[0].filePath
}

/**
 * Recursively find all markdown files in a directory
 */
async function findMdFilesRecursive(dirPath: string): Promise<string[]> {
  const results: string[] = []

  const entries = await readdir(dirPath, { withFileTypes: true })

  for (const entry of entries) {
    // Skip hidden files/directories
    if (entry.name.startsWith('.')) continue

    const fullPath = join(dirPath, entry.name)

    if (entry.isDirectory()) {
      const subFiles = await findMdFilesRecursive(fullPath)
      results.push(...subFiles)
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      results.push(fullPath)
    }
  }

  return results
}
