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

/**
 * Wrap content in standalone HTML (no live reload, for static export)
 */
export function wrapInStaticHtml(content: string, title: string): string {
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
${getStaticClientScript()}
  </script>
</body>
</html>`
}

/**
 * Minimal client script for static pages (just visualization, no SSE)
 */
function getStaticClientScript(): string {
  return `
// Render quantile dotplot visualizations
function renderDotplots() {
  document.querySelectorAll('.nf-viz').forEach(el => {
    const samples = JSON.parse(el.dataset.samples || '[]');
    const unit = el.dataset.unit || '';
    const min = parseFloat(el.dataset.min);
    const max = parseFloat(el.dataset.max);

    if (samples.length === 0) return;

    const canvas = document.createElement('canvas');
    canvas.width = el.clientWidth || 400;
    canvas.height = 60;
    canvas.style.width = '100%';
    canvas.style.height = '60px';
    el.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const dotRadius = 4;
    const padding = dotRadius + 2;

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, width, height);

    const useLog = max / min > 100;
    const toX = useLog
      ? v => padding + ((Math.log10(v) - Math.log10(min)) / (Math.log10(max) - Math.log10(min))) * (width - 2 * padding)
      : v => padding + ((v - min) / (max - min)) * (width - 2 * padding);

    ctx.fillStyle = 'rgba(99, 102, 241, 0.8)';
    samples.forEach(v => {
      const x = toX(v);
      const y = height / 2;
      ctx.beginPath();
      ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
      ctx.fill();
    });
  });
}

renderDotplots();
`
}
