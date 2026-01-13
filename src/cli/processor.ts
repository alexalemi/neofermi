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
import type { Quantity } from '../core/Quantity.js'
import { calculateDotplotData } from '../visualization/quantileDotplot.js'

interface CodeResult {
  output: string
  error: string | null
  vizData: VizData | null
}

interface VizData {
  samples: number[]
  unit: string
  min: number
  max: number
}

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
 * Build HTML for a NeoFermi cell
 */
function buildCellHtml(code: string, result: CodeResult): string {
  const escapedCode = escapeHtml(code)

  let resultHtml = ''
  if (result.error) {
    resultHtml = `<div class="nf-error">${escapeHtml(result.error)}</div>`
  } else if (result.output) {
    resultHtml = `<div class="nf-result">${result.output}</div>`

    if (result.vizData) {
      const vizAttrs = [
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
 * Execute NeoFermi code and return formatted result
 */
function executeCode(code: string, evaluator: Evaluator): CodeResult {
  try {
    const result = parse(code, evaluator)

    if (!result) {
      return { output: '', error: null, vizData: null }
    }

    const output = formatQuantityResult(result)
    const vizData = result.isDistribution() ? getVizData(result) : null

    return { output, error: null, vizData }
  } catch (err) {
    const errorMessage =
      err instanceof EvaluationError ? err.message : `Error: ${(err as Error).message}`
    return { output: '', error: errorMessage, vizData: null }
  }
}

/**
 * Format a Quantity result for display
 */
function formatQuantityResult(q: Quantity): string {
  const unit = q.unit.toString()
  const dimName = q.dimensionName?.() || null

  if (q.isDistribution()) {
    const mean = formatNumber(q.mean())
    const median = formatNumber(q.median())
    const p16 = formatNumber(q.percentile(0.16))
    const p84 = formatNumber(q.percentile(0.84))

    let unitStr = unit
    if (dimName && dimName !== 'dimensionless') {
      unitStr = `${unit} <span class="nf-dim">{${dimName}}</span>`
    }

    return `<div class="nf-stats">
<span class="nf-stat">Mean: <strong>${mean}</strong> ${unitStr}</span>
<span class="nf-stat">Median: ${median} ${unit}</span>
<span class="nf-stat">[68% CI]: [${p16}, ${p84}] ${unit}</span>
</div>`
  } else {
    const value = formatNumber(q.value)
    let unitStr = unit
    if (dimName && dimName !== 'dimensionless') {
      unitStr = `${unit} <span class="nf-dim">{${dimName}}</span>`
    }
    return `<span class="nf-scalar">${value} ${unitStr}</span>`
  }
}

/**
 * Get visualization data for a distribution
 */
function getVizData(q: Quantity): VizData {
  const samples = q.toParticles()
  const data = calculateDotplotData(samples, 100, q.unit.toString())
  return {
    samples: data.quantiles,
    unit: data.unit,
    min: data.min,
    max: data.max,
  }
}

/**
 * Format a number for display
 */
function formatNumber(n: number): string {
  if (!isFinite(n)) return String(n)

  const abs = Math.abs(n)
  if (abs >= 1e6 || (abs < 1e-3 && abs > 0)) {
    return n.toExponential(2)
  }
  if (abs >= 100) return n.toFixed(0)
  if (abs >= 10) return n.toFixed(1)
  if (abs >= 1) return n.toFixed(2)
  return n.toPrecision(3)
}

/**
 * Interpolate ${var} references in text
 */
function interpolateText(text: string, evaluator: Evaluator): string {
  return text.replace(/\$\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g, (match, varName) => {
    const value = evaluator.getVariable(varName)
    if (!value) return match

    if (value.isDistribution()) {
      const mean = formatNumber(value.mean())
      const unit = value.unit.toString()
      return `${mean} ${unit}`.trim()
    } else {
      const val = formatNumber(value.value)
      const unit = value.unit.toString()
      return `${val} ${unit}`.trim()
    }
  })
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
