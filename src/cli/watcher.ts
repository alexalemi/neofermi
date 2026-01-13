/**
 * File watcher for markdown files
 */

import chokidar from 'chokidar'
import { stat, readdir } from 'fs/promises'
import { join } from 'path'

/**
 * Watch a file or directory for markdown file changes
 */
export function watchFiles(path: string, onFileChange: (filePath: string) => void) {
  // Determine if path is a file or directory
  const isMarkdownFile = path.endsWith('.md')

  const watchPattern = isMarkdownFile ? path : join(path, '**/*.md')

  const watcher = chokidar.watch(watchPattern, {
    ignored: /(^|[\/\\])\../, // Ignore dotfiles
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 100,
      pollInterval: 50,
    },
  })

  watcher
    .on('change', (changedPath) => {
      if (changedPath.endsWith('.md')) {
        onFileChange(changedPath)
      }
    })
    .on('add', (addedPath) => {
      if (addedPath.endsWith('.md')) {
        onFileChange(addedPath)
      }
    })
    .on('error', (error) => {
      console.error('Watcher error:', error)
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
