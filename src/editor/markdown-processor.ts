/**
 * Markdown processor with NeoFermi expression extraction
 *
 * Uses markdown-it for parsing and provides hooks for:
 * - Fenced code blocks (``` or ```neofermi)
 * - Inline expressions (${variable})
 */

import MarkdownIt from 'markdown-it'
import type { EvaluationResult } from './expression-evaluator.js'
import { escapeHtml, buildCellHtml } from '../utils/html.js'

export interface ParsedExpression {
  id: string
  type: 'block' | 'inline'
  source: string
  /** For inline expressions, the raw expression text (bare var name or arbitrary expression) */
  expression?: string
}

export interface ProcessedDocument {
  expressions: ParsedExpression[]
  render: (results: Map<string, EvaluationResult>) => string
}

/**
 * Process markdown content and extract neofermi expressions
 */
export function processMarkdown(content: string): ProcessedDocument {
  const blockExpressions: ParsedExpression[] = []
  const inlineExpressions: ParsedExpression[] = []
  // Track block index by source position to ensure stable IDs across renders
  const blockIdMap = new Map<number, string>()
  let blockCounter = 0
  // Placeholders carry a per-document nonce so a literal `<!--nf:block-0-->`
  // typed in prose (html is enabled) can't be mistaken for one of ours.
  const nonce = Math.random().toString(36).slice(2, 10)

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
      blockExpressions.push({
        id: exprId,
        type: 'block',
        source: code,
      })
    }

    // Return placeholder that will be replaced with results
    return `<!--nf-${nonce}:${exprId}-->`
  }

  // Tokenize ${...} as a dedicated inline token — supports bare variables AND
  // arbitrary expressions (`${x * 2}`, `${100 m as feet}`, etc.). Because this
  // is an inline rule, it never fires inside code spans or fenced blocks, so
  // literal ${...} in code examples is left alone.
  md.inline.ruler.after('escape', 'nf_inline', (state, silent) => {
    const src = state.src
    if (src.charCodeAt(state.pos) !== 0x24 /* $ */ || src.charCodeAt(state.pos + 1) !== 0x7b /* { */) {
      return false
    }
    // Find the matching close brace: count nesting so mixture literals like
    // ${ {1, 2, 3} * 2 } work, and stop at the end of the inline run or the
    // line so an unclosed `${` can't swallow the rest of the paragraph.
    let depth = 1
    let end = -1
    for (let i = state.pos + 2; i < state.posMax; i++) {
      const ch = src.charCodeAt(i)
      if (ch === 0x0a /* \n */) break
      if (ch === 0x7b /* { */) depth++
      else if (ch === 0x7d /* } */ && --depth === 0) {
        end = i
        break
      }
    }
    if (end === -1) return false
    const content = src.slice(state.pos + 2, end)
    // A body starting with a backslash is LaTeX grouping right after `$`
    // (e.g. `${\bf x}$`) — leave it for the math renderer.
    if (content.trim() === '' || content.trimStart().startsWith('\\')) return false
    if (!silent) {
      const token = state.push('nf_inline', '', 0)
      token.content = content
    }
    state.pos = end + 1
    return true
  })

  // IDs are assigned by occurrence order during rendering, which is stable
  // across re-renders of the same content. The first render registers the
  // expressions; later renders just re-emit the same placeholder ids.
  let inlineRenderCounter = 0
  md.renderer.rules.nf_inline = (tokens, idx) => {
    const expression = tokens[idx].content
    const id = `inline-${inlineRenderCounter++}`
    if (inlineRenderCounter > inlineExpressions.length) {
      inlineExpressions.push({ id, type: 'inline', source: expression, expression })
    }
    return `<!--nf-${nonce}:${id}-->`
  }

  function renderDocument(): string {
    inlineRenderCounter = 0
    return md.render(content)
  }

  // First pass: render to extract block and inline expressions in document order
  renderDocument()

  // Blocks evaluate before inline expressions (matching the CLI processor),
  // so prose can reference variables defined anywhere in the document.
  const expressions = [...blockExpressions, ...inlineExpressions]

  /**
   * Render the final HTML with evaluation results
   */
  function render(results: Map<string, EvaluationResult>): string {
    const html = renderDocument()
    const placeholder = new RegExp(`<!--nf-${nonce}:((?:block|inline)-\\d+)-->`, 'g')
    return html.replace(placeholder, (_, exprId) => {
      const result = results.get(exprId)
      if (exprId.startsWith('inline-')) {
        return renderInlineResult(result)
      }
      if (!result) {
        return '<div class="nf-cell"><div class="nf-error">Expression not evaluated</div></div>'
      }
      return buildCellHtml(result.source || '', result, exprId)
    })
  }

  return { expressions, render }
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
