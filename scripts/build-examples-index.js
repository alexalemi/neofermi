#!/usr/bin/env node
// Generates examples/index.html — the gallery page linking every rendered
// example notebook. Run via `make examples`; the output is removed by
// `make clean` along with the other generated HTML.
//
// Each entry's title is the notebook's `# heading` and its blurb is the first
// paragraph line, so write that line as the one-sentence pitch.

import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const examplesDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'examples')

// Curated reading order; any notebook not listed is appended alphabetically.
const ORDER = [
  'piano_tuners',
  'household_electricity',
  'us_gasoline',
  'llm_training',
  'data_centers',
  'atmosphere_mass',
  'uk_tea',
  'daily_flights',
]

const escapeHtml = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// Escape, then render `code` spans — the blurbs mention syntax like `mean()`.
const inlineMarkdown = (s) => escapeHtml(s).replace(/`([^`]+)`/g, '<code>$1</code>')

const rank = (name) => {
  const i = ORDER.indexOf(name)
  return i === -1 ? ORDER.length : i
}

const entries = readdirSync(examplesDir)
  .filter((f) => f.endsWith('.md'))
  .map((f) => f.replace(/\.md$/, ''))
  .sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))
  .map((name) => {
    const lines = readFileSync(join(examplesDir, `${name}.md`), 'utf8').split('\n')
    const title = lines.find((l) => l.startsWith('# '))?.slice(2).trim() ?? name
    const blurb = lines.find((l) => l.trim() && !l.startsWith('#'))?.trim() ?? ''
    return { href: `./${name}.html`, title, blurb }
  })

const items = entries
  .map(
    ({ href, title, blurb }) => `      <li>
        <a href="${href}">${escapeHtml(title)}</a>
        <p>${inlineMarkdown(blurb)}</p>
      </li>`
  )
  .join('\n')

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Worked estimates - NeoFermi</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;1,8..60,400&display=swap">
  <style>
    :root {
      --paper: #ffffff; --ink: #1a1a2e; --muted: #6b6b7b; --rule: #e2e2ea;
      --code-bg: #f7f7fa; --accent: #2e5aac;
      --serif: 'Source Serif 4', 'Iowan Old Style', Georgia, serif;
      --mono: 'JetBrains Mono', ui-monospace, Menlo, monospace;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --paper: #16161f; --ink: #e6e6ee; --muted: #9a9aab; --rule: #2c2c3a;
        --code-bg: #1d1d28; --accent: #8fb0ec;
      }
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: var(--serif);
      font-size: 18px;
      line-height: 1.6;
      background: var(--paper);
      color: var(--ink);
      padding: 28px 24px 96px;
      font-variant-numeric: lining-nums;
      -webkit-font-smoothing: antialiased;
    }
    main { max-width: 42rem; margin: 0 auto; }
    .wordmark { font-weight: 600; font-size: 20px; color: var(--ink); text-decoration: none; }
    .wordmark:hover { color: var(--accent); }
    h1 { font-size: 2.3rem; font-weight: 600; line-height: 1.15; letter-spacing: -0.01em; margin: 56px 0 14px; }
    .intro { color: var(--muted); max-width: 36rem; }
    .intro a { color: var(--accent); text-underline-offset: 2px; }
    ol { list-style: none; margin-top: 40px; border-top: 1px solid var(--ink); }
    li { padding: 18px 0 20px; border-bottom: 1px solid var(--rule); }
    li a {
      font-size: 1.25rem; font-weight: 600; line-height: 1.3;
      color: var(--ink); text-decoration: none;
    }
    li a:hover { color: var(--accent); text-decoration: underline; text-underline-offset: 3px; }
    li p { color: var(--muted); margin-top: 4px; }
    code { font-family: var(--mono); font-size: 0.8em; background: var(--code-bg); padding: 0.1em 0.35em; border-radius: 3px; }
    :focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
    @media (max-width: 600px) {
      body { font-size: 17px; padding: 20px 16px 64px; }
      h1 { font-size: 1.9rem; margin-top: 40px; }
    }
  </style>
</head>
<body>
  <main>
    <a class="wordmark" href="../">NeoFermi</a>
    <h1>Worked estimates</h1>
    <p class="intro">
      Each one builds an estimate from guesses with honest ranges, then checks it against a published figure.
      Open any of them, or start your own in the <a href="../">notebook</a> or the <a href="../editor.html">editor</a>.
    </p>
    <ol>
${items}
    </ol>
  </main>
</body>
</html>
`

writeFileSync(join(examplesDir, 'index.html'), html)
console.log(`examples/index.html: ${entries.length} examples`)
