#!/usr/bin/env node
// Generates examples/index.html — a gallery page linking every rendered
// example notebook. Run via `make examples`; the output is removed by
// `make clean` along with the other generated HTML.

import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const examplesDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'examples')

const escapeHtml = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const entries = readdirSync(examplesDir)
  .filter((f) => f.endsWith('.md'))
  .sort()
  .map((file) => {
    const lines = readFileSync(join(examplesDir, file), 'utf8').split('\n')
    const title = lines.find((l) => l.startsWith('# '))?.slice(2).trim() ?? file
    const description =
      lines.find((l) => l.trim() && !l.startsWith('#'))?.trim() ?? ''
    return { href: file.replace(/\.md$/, '.html'), title, description }
  })

const items = entries
  .map(
    ({ href, title, description }) => `      <a class="card" href="./${href}">
        <h2>${escapeHtml(title)}</h2>
        <p>${escapeHtml(description)}</p>
      </a>`
  )
  .join('\n')

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NeoFermi Examples</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #ffffff;
      color: #24292f;
      line-height: 1.6;
      padding: 20px;
    }
    main { max-width: 800px; margin: 0 auto; }
    h1 { color: #1f2328; margin: 24px 0 8px; }
    .intro { color: #57606a; margin-bottom: 24px; }
    .intro a { color: #0969da; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; }
    .card {
      display: block;
      padding: 16px;
      border: 1px solid #d0d7de;
      border-radius: 8px;
      text-decoration: none;
      color: inherit;
    }
    .card:hover { border-color: #0969da; }
    .card h2 { font-size: 1rem; color: #0969da; margin-bottom: 4px; }
    .card p { font-size: 0.875rem; color: #57606a; }
    @media (prefers-color-scheme: dark) {
      body { background: #0d1117; color: #e6edf3; }
      h1 { color: #e6edf3; }
      .intro, .card p { color: #8b949e; }
      .card { border-color: #30363d; }
      .card:hover, .intro a, .card h2 { border-color: #2f81f7; color: #2f81f7; }
      .card:hover { color: inherit; }
    }
  </style>
</head>
<body>
  <main>
    <h1>NeoFermi Examples</h1>
    <p class="intro">
      Worked Fermi estimates rendered from markdown notebooks.
      Try your own in the <a href="../">notebook</a> or the <a href="../editor.html">editor</a>.
    </p>
    <div class="grid">
${items}
    </div>
  </main>
</body>
</html>
`

writeFileSync(join(examplesDir, 'index.html'), html)
console.log(`examples/index.html: ${entries.length} examples`)
