/**
 * Markdown processor with NeoFermi expression extraction
 *
 * Uses markdown-it for parsing and provides hooks for:
 * - Fenced code blocks (``` or ```neofermi)
 * - Inline expressions (${variable})
 */

import MarkdownIt from 'markdown-it'
import type { EvaluationResult } from './expression-evaluator.js'

export interface ParsedExpression {
  id: string
  type: 'block' | 'inline'
  source: string
  /** For inline expressions, the variable name being referenced */
  varName?: string
}

export interface ProcessedDocument {
  expressions: ParsedExpression[]
  render: (results: Map<string, EvaluationResult>) => string
}

/**
 * Process markdown content and extract neofermi expressions
 */
export function processMarkdown(content: string): ProcessedDocument {
  const expressions: ParsedExpression[] = []
  // Track block index by source position to ensure stable IDs across renders
  const blockIdMap = new Map<number, string>()
  let blockCounter = 0
  let inlineCounter = 0

  const md = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: true,
  })

  // Store original fence renderer
  const defaultFence = md.renderer.rules.fence || function(tokens, idx, options, _env, self) {
    return self.renderToken(tokens, idx, options)
  }

  // Custom fence renderer for neofermi blocks
  md.renderer.rules.fence = function(tokens, idx, options, _env, self) {
    const token = tokens[idx]
    const info = token.info ? token.info.trim().toLowerCase() : ''

    // Treat empty lang or 'neofermi' as neofermi code
    const isNeoFermi = info === '' || info === 'neofermi'

    if (!isNeoFermi) {
      // Regular code block - use default renderer
      return defaultFence(tokens, idx, options, _env, self)
    }

    const code = token.content.trim()
    if (!code) {
      return ''
    }

    // Use token map position for stable ID (survives re-renders)
    const pos = token.map ? token.map[0] : idx
    let exprId = blockIdMap.get(pos)
    if (!exprId) {
      exprId = `block-${blockCounter++}`
      blockIdMap.set(pos, exprId)
      expressions.push({
        id: exprId,
        type: 'block',
        source: code,
      })
    }

    // Return placeholder that will be replaced with results
    return `<!--nf:${exprId}-->`
  }

  // First pass: render markdown to get structure and extract block expressions
  // We need to do this before inline processing to establish the expression order
  md.render(content)

  // Extract inline expressions from the content
  // We parse the original content, not the rendered HTML
  const inlineRegex = /\$\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g
  let match
  const inlineExprs: Array<{ varName: string; id: string; fullMatch: string }> = []

  while ((match = inlineRegex.exec(content)) !== null) {
    const varName = match[1]
    const exprId = `inline-${inlineCounter++}`
    expressions.push({
      id: exprId,
      type: 'inline',
      source: varName, // For inline, source is just the var name
      varName,
    })
    inlineExprs.push({ varName, id: exprId, fullMatch: match[0] })
  }

  /**
   * Render the final HTML with evaluation results
   */
  function render(results: Map<string, EvaluationResult>): string {
    // Re-render markdown with block placeholders replaced
    let html = md.render(content)

    // Replace block placeholders
    html = html.replace(/<!--nf:(block-\d+)-->/g, (_, exprId) => {
      const result = results.get(exprId)
      if (!result) {
        return '<div class="nf-cell"><div class="nf-error">Expression not evaluated</div></div>'
      }
      return renderBlockResult(exprId, result)
    })

    // Replace inline expressions in the rendered HTML
    // We need to be careful to only replace in text content, not in code blocks
    for (const { id, fullMatch } of inlineExprs) {
      const result = results.get(id)
      const escapedMatch = escapeRegExp(fullMatch)
      // Only replace outside of <code> and <pre> tags
      // Simple approach: replace all occurrences (markdown-it should have already
      // converted code blocks, so inline ${} in code will be escaped)
      const replacement = renderInlineResult(result)
      html = html.replace(new RegExp(escapedMatch, 'g'), replacement)
    }

    return html
  }

  return { expressions, render }
}

/**
 * Render a block expression result as HTML
 */
function renderBlockResult(exprId: string, result: EvaluationResult): string {
  const escapedCode = escapeHtml(result.source || '')

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
        `data-expr-id="${exprId}"`,
        `data-samples="${escapeHtml(JSON.stringify(result.vizData.samples))}"`,
        `data-unit="${escapeHtml(result.vizData.unit)}"`,
        `data-min="${result.vizData.min}"`,
        `data-max="${result.vizData.max}"`,
      ].join(' ')
      resultHtml += `<div class="nf-viz" ${vizAttrs}></div>`
    }
  }

  return `<div class="nf-cell">
<pre class="nf-code"><code>${escapedCode}</code></pre>
${resultHtml}
</div>`
}

/**
 * Render an inline expression result
 */
function renderInlineResult(result: EvaluationResult | undefined): string {
  if (!result) {
    return '<span class="nf-inline nf-inline-error">???</span>'
  }

  if (result.error) {
    return `<span class="nf-inline nf-inline-error" title="${escapeHtml(result.error)}">error</span>`
  }

  return `<span class="nf-inline">${result.inlineOutput || result.output || '???'}</span>`
}

/**
 * Escape HTML special characters
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Escape special regex characters in a string
 */
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
