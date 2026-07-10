/**
 * `neoferminb annotate` — compute results and write them back into the
 * markdown file, so the document stands alone offline (see
 * src/core/annotations.ts for the annotation grammar).
 *
 * Idempotent: existing annotations are replaced, never duplicated, and
 * sampling runs under a fixed seed so unchanged input produces byte-identical
 * output. Errored blocks and expressions get no annotation (a warning is
 * reported instead), and any stale annotation of theirs is removed.
 */

import { Evaluator } from '../parser/index.js'
import { runCell } from '../core/runCell.js'
import { withSeededRandom } from '../utils/random.js'
import {
  RESULT_START,
  RESULT_END,
  inlineTokenRegex,
  scanInlineExpr,
} from '../core/annotations.js'

const ANNOTATE_SEED = 0x12345678 // same seed the test suite uses

export interface AnnotateResult {
  content: string
  blockCount: number
  inlineCount: number
  warnings: string[]
}

export function annotateMarkdown(source: string): AnnotateResult {
  return withSeededRandom(ANNOTATE_SEED, () => annotateUnseeded(source))
}

function annotateUnseeded(source: string): AnnotateResult {
  const evaluator = new Evaluator()
  const lines = source.split('\n')
  const out: string[] = []
  const warnings: string[] = []
  let blockCount = 0
  let inlineCount = 0

  let i = 0
  while (i < lines.length) {
    const open = lines[i].match(/^ {0,3}(`{3,}|~{3,})(.*)$/)
    if (!open) {
      out.push(annotateProse(lines[i], i + 1, evaluator, warnings, (n) => (inlineCount += n)))
      i++
      continue
    }

    // Copy the fenced block through verbatim
    const [, marker, info] = open
    const closeRe = new RegExp(`^ {0,3}\\${marker[0]}{${marker.length},}\\s*$`)
    out.push(lines[i])
    i++
    const body: string[] = []
    while (i < lines.length && !closeRe.test(lines[i])) {
      body.push(lines[i])
      out.push(lines[i])
      i++
    }
    const closed = i < lines.length
    if (closed) {
      out.push(lines[i])
      i++
    }

    const lang = info.trim().toLowerCase()
    const code = body.join('\n')
    if (!closed || (lang !== '' && lang !== 'neofermi') || !code.trim()) continue

    // Consume any existing annotation (optional blank line + marker block)
    let j = i
    if (j < lines.length && lines[j].trim() === '') j++
    if (j < lines.length && lines[j].trim() === RESULT_START) {
      let end = j + 1
      while (end < lines.length && lines[end].trim() !== RESULT_END) end++
      if (end < lines.length) i = end + 1
    }

    const result = runCell(code, evaluator)
    if (result.error) {
      warnings.push(`code block ending at line ${i}: ${result.error}`)
    } else if (result.inlineOutput) {
      out.push('', RESULT_START, `> \`${result.inlineOutput}\``, RESULT_END)
      blockCount++
    }
  }

  return { content: out.join('\n'), blockCount, inlineCount, warnings }
}

/**
 * Annotate one prose line: refresh existing `value`<!--nf:${expr}--> tokens
 * and convert bare ${expr} interpolations into annotated tokens. A `${…}`
 * inside an inline code span (odd number of backticks before it) is left
 * alone — it's being quoted, not evaluated.
 */
function annotateProse(
  line: string,
  lineNum: number,
  evaluator: Evaluator,
  warnings: string[],
  addInline: (n: number) => void
): string {
  let count = 0

  const render = (expr: string): string | null => {
    const r = runCell(expr, evaluator, { requireValue: true })
    if (r.error) {
      warnings.push(`line ${lineNum}: \${${expr.trim()}}: ${r.error}`)
      return null
    }
    count++
    return `\`${r.inlineOutput}\`<!--nf:\${${expr}}-->`
  }

  // Pass 1: refresh existing tokens (bare ${expr} on error)
  const refreshed = line.replace(inlineTokenRegex(), (_match, expr: string) => {
    return render(expr) ?? '${' + expr + '}'
  })

  // Pass 2: annotate bare ${expr} occurrences (skipping token comments,
  // which pass 1 just emitted — their backtick parity shields them too)
  let result = ''
  let pos = 0
  for (;;) {
    const hit = scanInlineExpr(refreshed, pos)
    if (!hit) {
      result += refreshed.slice(pos)
      break
    }
    result += refreshed.slice(pos, hit.start)
    const before = refreshed.slice(0, hit.start)
    const insideCodeSpan = (before.match(/`/g)?.length ?? 0) % 2 === 1
    const insideComment = before.endsWith('<!--nf:')
    if (insideCodeSpan || insideComment) {
      result += refreshed.slice(hit.start, hit.end)
    } else {
      result += render(hit.expr) ?? refreshed.slice(hit.start, hit.end)
    }
    pos = hit.end
  }

  addInline(count)
  return result
}
