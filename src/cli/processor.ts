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
import { parse, Evaluator, EvaluationError } from '../parser/index.js'
import { getVizData } from '../visualization/index.js'
import { formatQuantityConcise } from '../utils/format.js'
import { buildCellHtml, type CellResult } from '../utils/html.js'

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
      const result = executeCode(node.value, evaluator)

      // Replace with HTML node containing the cell
      const htmlContent = buildCellHtml(node.value, result)
      const htmlNode: Html = {
        type: 'html',
        value: htmlContent,
      }

      ;(parent.children as (Code | Html)[])[index] = htmlNode
    })

    // Second pass: interpolate ${var} in text
    visit(tree, 'text', (node: Text) => {
      node.value = interpolateText(node.value, evaluator)
    })
  }
}


/**
 * Execute NeoFermi code and return formatted result
 */
function executeCode(code: string, evaluator: Evaluator): CellResult {
  try {
    const result = parse(code, evaluator)

    if (!result) {
      return { output: '', error: null, vizData: null }
    }

    const output = formatQuantityConcise(result, { html: true })
    const vizData = result.isDistribution() ? getVizData(result) : null

    return { output, error: null, vizData }
  } catch (err) {
    const errorMessage =
      err instanceof EvaluationError ? err.message : `Error: ${(err as Error).message}`
    return { output: '', error: errorMessage, vizData: null }
  }
}


/**
 * Interpolate ${expr} references in text.
 *
 * `expr` may be a bare variable name (`${x}`) or any NeoFermi expression
 * (`${x * 2}`, `${100 m as feet}`). Expressions share the document
 * evaluator, so earlier `=` bindings are visible. Any `}` inside `expr`
 * ends the interpolation — use a variable assignment in a code block if
 * you need braces (e.g. weighted sets).
 *
 * A parse/eval failure is surfaced inline (`«error: …»`) rather than
 * silently leaving the raw `${…}` in the rendered document.
 */
function interpolateText(text: string, evaluator: Evaluator): string {
  return text.replace(/\$\{([^}]+)\}/g, (_match, expr) => {
    try {
      const value = parse(expr, evaluator)
      if (!value) return `«${expr.trim()}: no value»`
      return formatQuantityConcise(value)
    } catch (err) {
      const msg = err instanceof EvaluationError ? err.message : (err as Error).message
      return `«${expr.trim()}: ${msg}»`
    }
  })
}

