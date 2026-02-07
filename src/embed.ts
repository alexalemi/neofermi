/**
 * NeoFermi Embeddable Script
 *
 * Drop-in <script> for blog posts that auto-evaluates neofermi code blocks,
 * renders results + dotplots inline, and optionally shows a REPL widget.
 *
 * Usage:
 *   <script src="neofermi-embed.js"></script>
 *   <script src="neofermi-embed.js" data-repl="true"></script>
 */

import { parse, Evaluator, EvaluationError } from './parser/index.js'
import type { Quantity } from './core/Quantity.js'
import { createDotplotCanvas, calculateDotplotData } from './visualization/quantileDotplot.js'
import { formatNumber, formatQuantityConcise } from './utils/format.js'
import { escapeHtml } from './utils/html.js'

// Capture currentScript eagerly — it's null inside DOMContentLoaded callbacks
const _scriptEl = document.currentScript

// ── CSS injection ───────────────────────────────────────────────────────

function injectStyles(): void {
  if (document.getElementById('nf-embed-styles')) return
  const style = document.createElement('style')
  style.id = 'nf-embed-styles'
  style.textContent = `
.nf-embed-result {
  background: #f6f8fa;
  border: 1px solid #d1d9e0;
  border-radius: 6px;
  padding: 10px 14px;
  margin: 8px 0 16px 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 14px;
  line-height: 1.5;
}
.nf-embed-scalar {
  color: #0969da;
  font-weight: 500;
}
.nf-embed-ci {
  color: #656d76;
  font-size: 0.9em;
}
.nf-embed-dim {
  color: #656d76;
  font-style: italic;
  font-size: 0.9em;
}
.nf-embed-error {
  background: rgba(207, 34, 46, 0.08);
  color: #cf222e;
  border: 1px solid rgba(207, 34, 46, 0.2);
  border-radius: 6px;
  padding: 10px 14px;
  margin: 8px 0 16px 0;
  font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
  font-size: 0.85em;
}
.nf-embed-viz {
  display: flex;
  justify-content: center;
  margin-top: 6px;
}
.nf-embed-viz canvas {
  border-radius: 4px;
}
/* REPL widget */
.nf-embed-repl-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 99999;
  font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
}
.nf-embed-repl-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 32px;
  background: #1e1e1e;
  color: #4ec9b0;
  cursor: pointer;
  user-select: none;
  font-size: 16px;
  border-top: 1px solid #3e3e3e;
}
.nf-embed-repl-toggle:hover {
  background: #252525;
}
.nf-embed-repl-panel {
  display: none;
  flex-direction: column;
  height: 260px;
  background: #1e1e1e;
  border-top: 1px solid #3e3e3e;
}
.nf-embed-repl-panel.open {
  display: flex;
}
.nf-embed-repl-output {
  flex: 1;
  overflow-y: auto;
  padding: 8px 12px;
  font-size: 13px;
  color: #d4d4d4;
  line-height: 1.5;
}
.nf-embed-repl-output .repl-input-line {
  color: #888;
}
.nf-embed-repl-output .repl-result {
  color: #4ec9b0;
  margin-bottom: 8px;
}
.nf-embed-repl-output .repl-result .repl-dim {
  color: #888;
  font-style: italic;
}
.nf-embed-repl-output .repl-result canvas {
  display: block;
  margin-top: 4px;
  border-radius: 4px;
}
.nf-embed-repl-output .repl-error {
  color: #f48771;
  margin-bottom: 4px;
}
.nf-embed-repl-input-row {
  display: flex;
  align-items: center;
  border-top: 1px solid #3e3e3e;
  padding: 6px 12px;
  background: #252525;
}
.nf-embed-repl-prompt {
  color: #4ec9b0;
  margin-right: 8px;
  font-size: 14px;
}
.nf-embed-repl-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: #d4d4d4;
  font-family: inherit;
  font-size: 13px;
  caret-color: #4ec9b0;
}
`
  document.head.appendChild(style)
}

// ── Evaluate a code block ───────────────────────────────────────────────

const pendingCanvases = new Map<string, HTMLCanvasElement>()

function evaluateBlock(
  code: string,
  evaluator: Evaluator
): { html: string } {
  const lines = code.split('\n')
  let lastResult: Quantity | null = null

  for (const line of lines) {
    if (!line.trim()) continue
    try {
      const result = parse(line, evaluator)
      if (result) lastResult = result
    } catch (err) {
      const msg = err instanceof EvaluationError ? err.message : (err as Error).message
      return { html: `<div class="nf-embed-error">${escapeHtml(msg)}</div>` }
    }
  }

  if (!lastResult) return { html: '' }

  let resultHtml = `<div class="nf-embed-result">${formatQuantityConcise(lastResult, { html: true, classPrefix: 'nf-embed' })}`

  if (lastResult.isDistribution()) {
    const samples = lastResult.toParticles()
    const unit = lastResult.unit.toString()
    const canvas = createDotplotCanvas(samples, unit, {
      width: 280, height: 90, numDots: 20, dotRadius: 5, padding: 25,
    })
    const vizId = 'nf-viz-' + Math.random().toString(36).slice(2, 10)
    resultHtml += `<div class="nf-embed-viz" id="${vizId}"></div>`
    pendingCanvases.set(vizId, canvas)
  }

  resultHtml += '</div>'
  return { html: resultHtml }
}

function flushCanvases(): void {
  pendingCanvases.forEach((canvas, id) => {
    const el = document.getElementById(id)
    if (el) el.appendChild(canvas)
  })
  pendingCanvases.clear()
}

// ── REPL widget ─────────────────────────────────────────────────────────

function createRepl(evaluator: Evaluator): void {
  const bar = document.createElement('div')
  bar.className = 'nf-embed-repl-bar'

  const toggle = document.createElement('div')
  toggle.className = 'nf-embed-repl-toggle'
  toggle.innerHTML = '&#10095; neofermi'
  toggle.setAttribute('aria-label', 'Toggle NeoFermi REPL')

  const panel = document.createElement('div')
  panel.className = 'nf-embed-repl-panel'

  const output = document.createElement('div')
  output.className = 'nf-embed-repl-output'

  const inputRow = document.createElement('div')
  inputRow.className = 'nf-embed-repl-input-row'

  const prompt = document.createElement('span')
  prompt.className = 'nf-embed-repl-prompt'
  prompt.textContent = '\u276F'

  const input = document.createElement('input')
  input.className = 'nf-embed-repl-input'
  input.type = 'text'
  input.placeholder = 'Type a neofermi expression...'
  input.setAttribute('autocomplete', 'off')
  input.setAttribute('spellcheck', 'false')

  inputRow.appendChild(prompt)
  inputRow.appendChild(input)
  panel.appendChild(output)
  panel.appendChild(inputRow)
  bar.appendChild(panel)
  bar.appendChild(toggle)
  document.body.appendChild(bar)

  let isOpen = false

  function setOpen(open: boolean) {
    isOpen = open
    panel.classList.toggle('open', isOpen)
    toggle.innerHTML = isOpen ? '&#10095; close' : '&#10095; neofermi'
    if (isOpen) input.focus()
  }

  toggle.addEventListener('click', () => setOpen(!isOpen))
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setOpen(!isOpen)
  })

  const history: string[] = []
  let historyIndex = -1

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const code = input.value.trim()
      if (!code) return

      history.unshift(code)
      historyIndex = -1

      const inputLine = document.createElement('div')
      inputLine.className = 'repl-input-line'
      inputLine.textContent = '\u276F ' + code
      output.appendChild(inputLine)

      try {
        const result = parse(code, evaluator)
        if (result) {
          const resultLine = document.createElement('div')
          resultLine.className = 'repl-result'
          const u = result.unit.toString()
          const dimName = result.dimensionName?.() || null
          const dimSuffix = dimName && dimName !== 'dimensionless'
            ? ` <span class="repl-dim">{${dimName}}</span>`
            : ''
          if (result.isDistribution()) {
            const median = formatNumber(result.median())
            const p16 = formatNumber(result.percentile(0.16))
            const p84 = formatNumber(result.percentile(0.84))
            resultLine.innerHTML = `${median} [${p16}, ${p84}] ${escapeHtml(u)}${dimSuffix}`
            // Render dotplot
            const samples = result.toParticles()
            const canvas = createDotplotCanvas(samples, u, {
              width: 280, height: 90, numDots: 20, dotRadius: 5, padding: 25,
            })
            resultLine.appendChild(canvas)
          } else {
            resultLine.innerHTML = `${formatNumber(result.value as number)} ${escapeHtml(u)}${dimSuffix}`
          }
          output.appendChild(resultLine)
        }
      } catch (err) {
        const errLine = document.createElement('div')
        errLine.className = 'repl-error'
        errLine.textContent = err instanceof EvaluationError ? err.message : (err as Error).message
        output.appendChild(errLine)
      }

      output.scrollTop = output.scrollHeight
      input.value = ''
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (history.length > 0 && historyIndex < history.length - 1) {
        historyIndex++
        input.value = history[historyIndex]
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (historyIndex > 0) {
        historyIndex--
        input.value = history[historyIndex]
      } else {
        historyIndex = -1
        input.value = ''
      }
    }
  })
}

// ── Initialization ──────────────────────────────────────────────────────

function init(): void {
  injectStyles()

  const evaluator = new Evaluator()

  // Find and evaluate all neofermi code blocks
  const codeBlocks = document.querySelectorAll<HTMLElement>('code.language-neofermi')
  codeBlocks.forEach((codeEl) => {
    const code = codeEl.textContent || ''
    if (!code.trim()) return

    const { html } = evaluateBlock(code, evaluator)
    if (!html) return

    const pre = codeEl.closest('pre')
    const insertAfter = pre || codeEl
    insertAfter.insertAdjacentHTML('afterend', html)
  })

  flushCanvases()

  // Optional REPL — activated via data-repl="true" on the script tag
  const scriptEl = _scriptEl || document.querySelector('script[src*="neofermi-embed"]')
  if (scriptEl && scriptEl.getAttribute('data-repl') === 'true') {
    createRepl(evaluator)
  }
}

// Auto-initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}

// ── Public API (exposed as window.NeoFermi in IIFE build) ───────────────

export { parse, Evaluator, EvaluationError, calculateDotplotData }
