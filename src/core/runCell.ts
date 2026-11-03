/**
 * One shared "parse → evaluate → format" path for every rendering surface
 * (embed widget, markdown editor, CLI notebook). Surfaces differ only in how
 * they present the returned `CellResult`.
 */

import { parseToAST, Evaluator } from '../parser/index.js'
import type { ASTNode } from '../parser/ast.js'
import type { Quantity } from './Quantity.js'
import { getVizData, type VizData } from '../visualization/index.js'
import { formatQuantityConcise } from '../utils/format.js'

export interface CellResult {
  /** HTML-formatted result (`''` on error or no value). */
  output: string
  /** Plain-text result for inline `${…}` in prose: no `{dimension}` tag (`''` on error/no value). */
  inlineOutput: string
  /** The same inline result as typeset HTML. */
  inlineHtml: string
  /** Error message, or `null`. */
  error: string | null
  /** The evaluated quantity, or `null` on error / no value. */
  quantity: Quantity | null
  /** Dotplot data when the result is a distribution, else `null`. */
  vizData: VizData | null
  /** Plain-text report produced alongside the value (`sensitivity(x)`), else `null`. */
  report: string | null
  /** Variable name when the chunk ends in an assignment (`tuners = …`), else `null`. */
  label: string | null
}

const EMPTY: CellResult = {
  output: '',
  inlineOutput: '',
  inlineHtml: '',
  error: null,
  quantity: null,
  vizData: null,
  report: null,
  label: null,
}

/**
 * Parse and evaluate one chunk of NeoFermi source against `evaluator` (so
 * earlier `=` bindings carry over), returning a render-ready result. Parse and
 * evaluation errors are caught and reported in `error`.
 *
 * `opts.requireValue` turns a statement that yields nothing (an assignment,
 * a function definition) into an error rather than a silent blank — used for
 * inline `${…}` expressions, which should always produce something to show.
 */
export function runCell(
  code: string,
  evaluator: Evaluator,
  opts: { requireValue?: boolean } = {},
): CellResult {
  let value: Quantity | null
  let report: string | null = null
  let label: string | null = null
  try {
    const ast = parseToAST(code)
    value = evaluator.evaluate(ast)
    report = evaluator.takeReport()
    label = assignedName(ast)
  } catch (err) {
    evaluator.takeReport()
    // No "Error: " prefix here — surfaces add their own label, and a
    // built-in prefix produced "Error: Error: ..." doubling.
    return { ...EMPTY, error: (err as Error).message }
  }

  if (!value) {
    return opts.requireValue
      ? { ...EMPTY, error: `Expression produced no value: ${code.trim()}` }
      : { ...EMPTY }
  }

  return {
    output: formatQuantityConcise(value, { html: true }),
    inlineOutput: formatQuantityConcise(value, { dimension: false }),
    inlineHtml: formatQuantityConcise(value, { html: true, dimension: false }),
    error: null,
    quantity: value,
    vizData: value.isDistribution() ? getVizData(value) : null,
    report,
    label,
  }
}

/** The name bound by the chunk's last statement, if it is an assignment. */
function assignedName(ast: ASTNode): string | null {
  const last = ast.type === 'Program' ? ast.statements[ast.statements.length - 1] : ast
  return last?.type === 'Assignment' ? last.name : null
}
