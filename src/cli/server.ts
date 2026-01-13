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

export function createServer(port: number, host: string, getNotebook: () => NotebookData) {
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
    serve({ fetch: app.fetch, port, hostname: host })
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
export function wrapInStaticHtml(content: string, title: string, darkMode: boolean = false): string {
  const highlightTheme = darkMode ? 'github-dark' : 'github'
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} - NeoFermi Notebook</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/${highlightTheme}.min.css">
  <style>
${getStyles(darkMode)}
  </style>
</head>
<body>
  <article class="neofermi-notebook">
${content}
  </article>
  <script type="module">
${getStaticClientScript(darkMode)}
  </script>
</body>
</html>`
}

/**
 * Minimal client script for static pages (just visualization, no SSE)
 */
function getStaticClientScript(darkMode: boolean): string {
  // Theme colors
  const bgColor = darkMode ? '#1a1a2e' : '#f8f9fa'
  const dotColor = darkMode ? 'rgba(99, 102, 241, 0.85)' : 'rgba(37, 99, 235, 0.8)'
  const axisColor = darkMode ? '#555' : '#ccc'
  const labelColor = darkMode ? '#999' : '#666'
  const unitColor = darkMode ? '#777' : '#888'

  return `
// Nice number for tick marks (1, 2, 5, 10, 20, 50, etc.)
function niceNum(x, round) {
  if (x === 0) return 0;
  const exp = Math.floor(Math.log10(Math.abs(x)));
  const f = x / Math.pow(10, exp);
  let nf;
  if (round) {
    nf = f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10;
  } else {
    nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
  }
  return nf * Math.pow(10, exp);
}

function generateLinearTicks(min, max, maxTicks = 5) {
  const range = niceNum(max - min, false);
  const spacing = niceNum(range / (maxTicks - 1), true);
  const niceMin = Math.floor(min / spacing) * spacing;
  const niceMax = Math.ceil(max / spacing) * spacing;
  const ticks = [];
  for (let t = niceMin; t <= niceMax + spacing * 0.5; t += spacing) {
    if (t >= min && t <= max) ticks.push(t);
  }
  return ticks;
}

function generateLogTicks(min, max) {
  if (min <= 0 || max <= 0) return [];
  const minExp = Math.floor(Math.log10(min));
  const maxExp = Math.ceil(Math.log10(max));
  const ticks = [];
  for (let exp = minExp; exp <= maxExp; exp++) {
    const tick = Math.pow(10, exp);
    if (tick >= min * 0.99 && tick <= max * 1.01) ticks.push(tick);
  }
  if (ticks.length <= 2) {
    const allTicks = [];
    for (let exp = minExp; exp <= maxExp; exp++) {
      for (const mult of [1, 2, 5]) {
        const tick = mult * Math.pow(10, exp);
        if (tick >= min * 0.99 && tick <= max * 1.01) allTicks.push(tick);
      }
    }
    return allTicks;
  }
  return ticks;
}

function formatNum(n) {
  if (n === 0) return '0';
  const abs = Math.abs(n);
  if (abs >= 10000 || abs < 0.001) return n.toExponential(0);
  if (Math.abs(n - Math.round(n)) < 0.001) return Math.round(n).toString();
  if (abs >= 100) return n.toFixed(0);
  if (abs >= 10) return n.toFixed(1);
  if (abs >= 1) return n.toFixed(2);
  return n.toPrecision(2);
}

function renderDotplots() {
  document.querySelectorAll('.nf-viz').forEach(el => {
    const samples = JSON.parse(el.dataset.samples || '[]');
    const unit = el.dataset.unit || '';
    const min = parseFloat(el.dataset.min);
    const max = parseFloat(el.dataset.max);

    if (samples.length === 0) return;

    const dpr = window.devicePixelRatio || 1;
    const displayWidth = 280;
    const displayHeight = 90;

    const canvas = document.createElement('canvas');
    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;
    canvas.style.width = displayWidth + 'px';
    canvas.style.height = displayHeight + 'px';
    el.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const width = displayWidth;
    const height = displayHeight;
    const dotRadius = 5;
    const padding = 25;
    const axisHeight = 20;

    // Background
    ctx.fillStyle = '${bgColor}';
    ctx.fillRect(0, 0, width, height);

    const useLog = min > 0 && max > 0 && (max / min) > 100;
    const toX = useLog
      ? v => padding + ((Math.log10(v) - Math.log10(min)) / (Math.log10(max) - Math.log10(min))) * (width - 2 * padding)
      : v => padding + ((v - min) / (max - min)) * (width - 2 * padding);

    // Generate nice ticks
    const ticks = useLog ? generateLogTicks(min, max) : generateLinearTicks(min, max, 5);

    // Bin dots by X position to stack them vertically
    const binWidth = dotRadius * 2.2;
    const bins = new Map();
    samples.forEach(v => {
      const x = toX(v);
      const binIndex = Math.round(x / binWidth);
      if (!bins.has(binIndex)) bins.set(binIndex, []);
      bins.get(binIndex).push(v);
    });

    // Draw stacked dots from bottom up, all dots in a bin share the same X
    const baseY = height - axisHeight - dotRadius - 2;
    ctx.fillStyle = '${dotColor}';
    bins.forEach((dots, binIndex) => {
      const x = binIndex * binWidth; // Use bin center, not individual x
      dots.forEach((v, i) => {
        const y = baseY - i * (dotRadius * 2.2);
        if (y > dotRadius) {
          ctx.beginPath();
          ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    });

    // Draw axis line
    const axisY = height - axisHeight;
    ctx.strokeStyle = '${axisColor}';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, axisY);
    ctx.lineTo(width - padding, axisY);
    ctx.stroke();

    // Draw ticks and labels
    ctx.fillStyle = '${labelColor}';
    ctx.font = '10px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ticks.forEach(tick => {
      const x = toX(tick);
      // Tick mark
      ctx.beginPath();
      ctx.moveTo(x, axisY);
      ctx.lineTo(x, axisY + 4);
      ctx.stroke();
      // Label
      ctx.fillText(formatNum(tick), x, axisY + 14);
    });

    // Unit label on right
    if (unit) {
      ctx.fillStyle = '${unitColor}';
      ctx.textAlign = 'right';
      ctx.fillText(unit, width - 5, axisY + 14);
    }
  });
}

renderDotplots();
`
}
