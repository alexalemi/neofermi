/**
 * One shared "parse → evaluate → format" path for every rendering surface
 * (embed widget, markdown editor, CLI notebook). Surfaces differ only in how
 * they present the returned `CellResult`.
 */

import { parse, Evaluator, EvaluationError } from '../parser/index.js'
import type { Quantity } from './Quantity.js'
import { getVizData, type VizData } from '../visualization/index.js'
import { formatQuantityConcise } from '../utils/format.js'

export interface CellResult {
  /** HTML-formatted result (`''` on error or no value). */
  output: string
  /** Plain-text result, for inline `${…}` substitution (`''` on error/no value). */
  inlineOutput: string
  /** Error message, or `null`. */
  error: string | null
  /** The evaluated quantity, or `null` on error / no value. */
  quantity: Quantity | null
  /** Dotplot data when the result is a distribution, else `null`. */
  vizData: VizData | null
}

const EMPTY: CellResult = {
  output: '',
  inlineOutput: '',
  error: null,
  quantity: null,
  vizData: null,
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
  try {
    value = parse(code, evaluator)
  } catch (err) {
    const error =
      err instanceof EvaluationError ? err.message : `Error: ${(err as Error).message}`
    return { ...EMPTY, error }
  }

  if (!value) {
    return opts.requireValue
      ? { ...EMPTY, error: `Expression produced no value: ${code.trim()}` }
      : { ...EMPTY }
  }

  return {
    output: formatQuantityConcise(value, { html: true }),
    inlineOutput: formatQuantityConcise(value),
    error: null,
    quantity: value,
    vizData: value.isDistribution() ? getVizData(value) : null,
  }
}
