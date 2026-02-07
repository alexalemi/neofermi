/**
 * Expression evaluator for NeoFermi markdown editor
 *
 * Evaluates expressions top-to-bottom with a fresh Evaluator,
 * ensuring deterministic results regardless of edit history.
 */

import { parse, Evaluator, EvaluationError } from '../parser/index.js'
import type { Quantity } from '../core/Quantity.js'
import { getVizData, type VizData } from '../visualization/index.js'
import { formatQuantityConcise } from '../utils/format.js'
import type { ParsedExpression } from './markdown-processor.js'

export type { VizData }

export interface EvaluationResult {
  source: string
  output: string
  /** Compact output for inline display */
  inlineOutput?: string
  error: string | null
  quantity: Quantity | null
  vizData: VizData | null
}

/**
 * Evaluate all expressions in document order
 *
 * Creates a fresh Evaluator instance to ensure top-to-bottom
 * semantics without hidden state from previous evaluations.
 */
export function evaluateExpressions(
  expressions: ParsedExpression[]
): Map<string, EvaluationResult> {
  const results = new Map<string, EvaluationResult>()
  const evaluator = new Evaluator()

  for (const expr of expressions) {
    if (expr.type === 'block') {
      // Block expressions: evaluate the full code
      const result = evaluateCode(expr.source, evaluator)
      results.set(expr.id, {
        source: expr.source,
        ...result,
      })
    } else {
      // Inline expressions: look up the variable
      const result = evaluateVariable(expr.varName!, evaluator)
      results.set(expr.id, {
        source: expr.source,
        ...result,
      })
    }
  }

  return results
}

/**
 * Evaluate a block of neofermi code
 */
function evaluateCode(
  code: string,
  evaluator: Evaluator
): Omit<EvaluationResult, 'source'> {
  try {
    const result = parse(code, evaluator)

    if (!result) {
      return { output: '', inlineOutput: '', error: null, quantity: null, vizData: null }
    }

    const output = formatQuantityConcise(result, { html: true })
    const inlineOutput = formatQuantityConcise(result)
    const vizData = result.isDistribution() ? getVizData(result) : null

    return { output, inlineOutput, error: null, quantity: result, vizData }
  } catch (err) {
    const errorMessage =
      err instanceof EvaluationError ? err.message : `Error: ${(err as Error).message}`
    return { output: '', error: errorMessage, quantity: null, vizData: null }
  }
}

/**
 * Look up a variable and format its value
 */
function evaluateVariable(
  varName: string,
  evaluator: Evaluator
): Omit<EvaluationResult, 'source'> {
  const value = evaluator.getVariable(varName)

  if (!value) {
    return {
      output: '',
      inlineOutput: undefined,
      error: `Variable '${varName}' not defined`,
      quantity: null,
      vizData: null,
    }
  }

  const output = formatQuantityConcise(value, { html: true })
  const inlineOutput = formatQuantityConcise(value)

  return {
    output,
    inlineOutput,
    error: null,
    quantity: value,
    vizData: null, // No viz for inline
  }
}


