/**
 * HTTP server with Server-Sent Events for live reload
 */

import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { streamSSE } from 'hono/streaming'
import { getStyles } from './assets/styles.js'
import { getClientScript } from './assets/client.js'

interface NotebookData {
  html: string
  title: string
}

type SSEStream = {
  writeSSE: (data: { event?: string; data: string }) => Promise<void>
  close: () => void
}

export function createServer(port: number, getNotebook: () => NotebookData) {
  const app = new Hono()
  const clients: Set<SSEStream> = new Set()

  // Serve rendered notebook
  app.get('/', (c) => {
    const { html, title } = getNotebook()
    return c.html(wrapInHtml(html, title))
  })

  // SSE endpoint for live reload
  app.get('/events', (c) => {
    return streamSSE(c, async (stream) => {
      const client: SSEStream = {
        writeSSE: (data) => stream.writeSSE(data),
        close: () => stream.close(),
      }
      clients.add(client)

      // Send initial connection message
      await stream.writeSSE({ event: 'connected', data: 'ok' })

      // Keep connection alive with periodic pings
      const pingInterval = setInterval(async () => {
        try {
          await stream.writeSSE({ event: 'ping', data: Date.now().toString() })
        } catch {
          clearInterval(pingInterval)
          clients.delete(client)
        }
      }, 30000)

      // Handle client disconnect
      stream.onAbort(() => {
        clearInterval(pingInterval)
        clients.delete(client)
      })

      // Keep the stream open
      await new Promise(() => {})
    })
  })

  // Notify all clients to reload
  function notifyReload() {
    const deadClients: SSEStream[] = []
    for (const client of clients) {
      try {
        client.writeSSE({ event: 'reload', data: Date.now().toString() })
      } catch {
        deadClients.push(client)
      }
    }
    // Clean up dead clients
    for (const client of deadClients) {
      clients.delete(client)
    }
  }

  function start() {
    serve({ fetch: app.fetch, port })
  }

  return { app, notifyReload, start }
}

function wrapInHtml(content: string, title: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} - NeoFermi Notebook</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css">
  <style>
${getStyles()}
  </style>
</head>
<body>
  <article class="neofermi-notebook">
${content}
  </article>
  <script type="module">
${getClientScript()}
  </script>
</body>
</html>`
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
