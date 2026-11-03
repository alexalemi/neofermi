/**
 * Markdown processor for NeoFermi notebooks
 *
 * Parses markdown, executes NeoFermi code blocks, and interpolates variables.
 */

import { readFile } from 'fs/promises'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkRehype from 'remark-rehype'
import rehypeStringify from 'rehype-stringify'
import { visit } from 'unist-util-visit'
import type { Root, Code, Text, Html } from 'mdast'
import { Evaluator } from '../parser/index.js'
import { runCell } from '../core/runCell.js'
import { buildCellHtml, escapeHtml } from '../utils/html.js'
import { stripAnnotations, scanInlineExpr } from '../core/annotations.js'

/**
 * Process a markdown file and return rendered HTML
 */
export async function processMarkdown(filePath: string): Promise<string> {
  const content = await readFile(filePath, 'utf-8')
  return processMarkdownContent(content)
}

/**
 * Process markdown content string and return rendered HTML
 */
export async function processMarkdownContent(content: string): Promise<string> {
  // Annotations written by `neoferminb annotate` are recomputed live rather
  // than rendered stale (and their result blocks would double-display).
  content = stripAnnotations(content)

  // Create a fresh evaluator for this document
  const evaluator = new Evaluator()

  // Build the processing pipeline
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkNeoFermi, { evaluator }) // Execute code blocks and interpolate
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeStringify, { allowDangerousHtml: true })

  const result = await processor.process(content)
  return String(result)
}

/**
 * Remark plugin to process NeoFermi code blocks and interpolations
 */
function remarkNeoFermi(options: { evaluator: Evaluator }) {
  const { evaluator } = options

  return (tree: Root) => {
    // First pass: execute all NeoFermi code blocks
    visit(tree, 'code', (node: Code, index, parent) => {
      if (!parent || index === undefined) return

      const lang = node.lang?.toLowerCase() || ''
      const isNeoFermi = lang === '' || lang === 'neofermi'

      if (!isNeoFermi) {
        // Non-NeoFermi code block - leave as-is for syntax highlighting
        return
      }

      if (!node.value.trim()) return

      // Execute the code
      const result = runCell(node.value, evaluator)

      // Replace with HTML node containing the cell
      const htmlContent = buildCellHtml(node.value, result)
      const htmlNode: Html = {
        type: 'html',
        value: htmlContent,
      }

      ;(parent.children as (Code | Html)[])[index] = htmlNode
    })

    // Second pass: interpolate ${var} in text. A text node with expressions
    // becomes text + html nodes so results can carry typeset markup.
    visit(tree, 'text', (node: Text, index, parent) => {
      if (!parent || index === undefined) return
      const parts = interpolateText(node.value, evaluator)
      if (parts.length === 1 && parts[0].type === 'text') return
      ;(parent.children as (Text | Html)[]).splice(index, 1, ...parts)
      return index + parts.length
    })
  }
}


/**
 * Interpolate ${expr} references in text.
 *
 * `expr` may be a bare variable name (`${x}`) or any NeoFermi expression
 * (`${x * 2}`, `${100 m as feet}`, `${ {1, 2, 3} * 2 }` — braces nest).
 * Expressions share the document evaluator, so earlier `=` bindings are
 * visible. An unclosed `${`, an empty body, or a body starting with a
 * backslash (LaTeX grouping such as `${\bf x}$`) is left as literal text;
 * expressions do not span lines.
 *
 * A parse/eval failure is surfaced inline (`«expr: message»`) rather than
 * silently leaving the raw `${…}` in the rendered document.
 */
function interpolateText(text: string, evaluator: Evaluator): (Text | Html)[] {
  const parts: (Text | Html)[] = []
  const pushText = (value: string) => { if (value) parts.push({ type: 'text', value }) }
  let pos = 0
  for (;;) {
    const hit = scanInlineExpr(text, pos)
    if (!hit) {
      pushText(text.slice(pos))
      break
    }
    pushText(text.slice(pos, hit.start))
    const r = runCell(hit.expr, evaluator, { requireValue: true })
    parts.push({
      type: 'html',
      value: r.error
        ? `<span class="nf-inline nf-inline-error">«${escapeHtml(hit.expr.trim())}: ${escapeHtml(r.error)}»</span>`
        : `<span class="nf-inline">${r.inlineHtml}</span>`,
    })
    pos = hit.end
  }
  return parts.length ? parts : [{ type: 'text', value: '' }]
}

