/**
 * Shared HTML utilities for all NeoFermi rendering surfaces
 */

import type { VizData } from '../visualization/index.js'

/**
 * Escape HTML special characters to prevent XSS
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export interface CellResult {
  output: string
  error: string | null
  vizData: VizData | null
}

/**
 * Build HTML for a NeoFermi cell (code block + result)
 *
 * Used by CLI processor (remark pipeline) and editor (markdown-it pipeline).
 * The optional exprId adds data-expr-id to the viz element for the editor.
 */
export function buildCellHtml(code: string, result: CellResult, exprId?: string): string {
  const escapedCode = escapeHtml(code)

  if (result.error) {
    return `<div class="nf-cell">
<pre class="nf-code"><code>${escapedCode}</code></pre>
<div class="nf-error">${escapeHtml(result.error)}</div>
</div>`
  }

  let resultHtml = ''
  if (result.output) {
    resultHtml = `<div class="nf-result">${result.output}</div>`

    if (result.vizData) {
      const vizAttrs = [
        exprId ? `data-expr-id="${exprId}"` : '',
        `data-samples="${escapeHtml(JSON.stringify(result.vizData.samples))}"`,
        `data-unit="${escapeHtml(result.vizData.unit)}"`,
        `data-min="${result.vizData.min}"`,
        `data-max="${result.vizData.max}"`,
      ].filter(Boolean).join(' ')
      resultHtml += `<div class="nf-viz" ${vizAttrs}></div>`
    }
  }

  return `<div class="nf-cell">
<pre class="nf-code"><code>${escapedCode}</code></pre>
${resultHtml}
</div>`
}
