/**
 * Expression evaluator for the NeoFermi markdown editor.
 *
 * Evaluates every expression in document order against a fresh Evaluator, so
 * results are deterministic regardless of edit history. Block code and inline
 * `${…}` expressions both go through the shared `runCell`.
 */

import { Evaluator } from '../parser/index.js'
import { runCell, type CellResult } from '../core/runCell.js'
import type { VizData } from '../visualization/index.js'
import type { ParsedExpression } from './markdown-processor.js'

export type { VizData }

export interface EvaluationResult extends CellResult {
  source: string
}

/**
 * Evaluate all expressions in document order, keyed by expression id.
 */
export function evaluateExpressions(
  expressions: ParsedExpression[]
): Map<string, EvaluationResult> {
  const results = new Map<string, EvaluationResult>()
  const evaluator = new Evaluator()

  for (const expr of expressions) {
    const result =
      expr.type === 'block'
        ? runCell(expr.source, evaluator)
        : runCell(expr.expression!, evaluator, { requireValue: true })
    results.set(expr.id, { source: expr.source, ...result })
  }

  return results
}
