/**
 * Markdown result annotations
 *
 * `neoferminb annotate` writes computed results back into a markdown file so
 * it stands alone offline. Two forms, both idempotent:
 *
 * Block results — after an executable fenced code block:
 *
 *     <!-- nf:results -->
 *     > `290 [150, 560] km {length}`
 *     <!-- /nf:results -->
 *
 * Inline results — a `${expr}` in prose becomes its value with the original
 * expression preserved in an invisible HTML comment:
 *
 *     `290 km`<!--nf:${distance}-->
 *
 * This module owns the shared grammar: the markers, the inline-token regex,
 * the strippers that recover the pristine source (used by the live renderers
 * so annotated documents stay fresh), and the `${…}` scanner shared by the
 * CLI interpolator and the annotator.
 */

export const RESULT_START = '<!-- nf:results -->'
export const RESULT_END = '<!-- /nf:results -->'

/** One inline annotation token: `value`<!--nf:${expr}-->  (expr lazily matched). */
const INLINE_TOKEN_SOURCE = '`[^`\\n]*`<!--nf:\\$\\{(.*?)\\}-->'

export function inlineTokenRegex(): RegExp {
  return new RegExp(INLINE_TOKEN_SOURCE, 'g')
}

/** Replace inline annotation tokens with the bare `${expr}` they encode. */
export function stripInlineAnnotations(content: string): string {
  return content.replace(inlineTokenRegex(), (_match, expr) => '${' + expr + '}')
}

/** Remove nf:results blocks (plus the single blank line the annotator adds). */
export function stripResultBlocks(content: string): string {
  const lines = content.split('\n')
  const out: string[] = []
  let i = 0
  while (i < lines.length) {
    if (lines[i].trim() === RESULT_START) {
      let end = i + 1
      while (end < lines.length && lines[end].trim() !== RESULT_END) end++
      if (end < lines.length) {
        // Drop the blank separator the annotator inserted before the block
        if (out.length > 0 && out[out.length - 1].trim() === '') out.pop()
        i = end + 1
        continue
      }
    }
    out.push(lines[i])
    i++
  }
  return out.join('\n')
}

/** Recover the pristine (pre-annotation) source of a document. */
export function stripAnnotations(content: string): string {
  return stripInlineAnnotations(stripResultBlocks(content))
}

/**
 * Find the next `${expr}` in `text` at or after `from`, honoring the
 * interpolation rules shared by every surface: braces nest, expressions do
 * not span lines, and an unclosed `${`, empty body, or `\`-leading body
 * (LaTeX grouping like `${\bf x}$`) is not an expression.
 *
 * Returns the token span [start, end) and the inner expression, or null.
 */
export function scanInlineExpr(
  text: string,
  from: number
): { start: number; end: number; expr: string } | null {
  let i = from
  while (i < text.length) {
    const start = text.indexOf('${', i)
    if (start === -1) return null
    let depth = 1
    let close = -1
    for (let j = start + 2; j < text.length; j++) {
      const ch = text[j]
      if (ch === '\n') break
      if (ch === '{') depth++
      else if (ch === '}' && --depth === 0) {
        close = j
        break
      }
    }
    const expr = close === -1 ? '' : text.slice(start + 2, close)
    if (close === -1 || expr.trim() === '' || expr.trimStart().startsWith('\\')) {
      i = start + 2
      continue
    }
    return { start, end: close + 1, expr }
  }
  return null
}
