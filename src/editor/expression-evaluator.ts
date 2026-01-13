/**
 * Expression evaluator for NeoFermi markdown editor
 *
 * Evaluates expressions top-to-bottom with a fresh Evaluator,
 * ensuring deterministic results regardless of edit history.
 */

import { parse, Evaluator, EvaluationError } from '../parser/index.js'
import type { Quantity } from '../core/Quantity.js'
import { calculateDotplotData } from '../visualization/quantileDotplot.js'
import type { ParsedExpression } from './markdown-processor.js'

export interface VizData {
  samples: number[]
  unit: string
  min: number
  max: number
}

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

    const output = formatQuantityResult(result)
    const inlineOutput = formatQuantityInline(result)
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

  const output = formatQuantityResult(value)
  const inlineOutput = formatQuantityInline(value)

  return {
    output,
    inlineOutput,
    error: null,
    quantity: value,
    vizData: null, // No viz for inline
  }
}

/**
 * Format a Quantity result for block display (detailed stats)
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
    const value = formatNumber(q.value as number)
    let unitStr = unit
    if (dimName && dimName !== 'dimensionless') {
      unitStr = `${unit} <span class="nf-dim">{${dimName}}</span>`
    }
    return `<span class="nf-scalar">${value} ${unitStr}</span>`
  }
}

/**
 * Format a Quantity for inline display (compact)
 *
 * For distributions: median [p16 - p84] unit
 * For scalars: value unit
 */
function formatQuantityInline(q: Quantity): string {
  const unit = q.unit.toString()
  const dimName = q.dimensionName?.()
  const dimSuffix = dimName && dimName !== 'dimensionless' ? ` {${dimName}}` : ''

  if (q.isDistribution()) {
    const median = formatNumber(q.median())
    const p16 = formatNumber(q.percentile(0.16))
    const p84 = formatNumber(q.percentile(0.84))
    return `${median} [${p16} – ${p84}] ${unit}${dimSuffix}`.trim()
  } else {
    const value = formatNumber(q.value as number)
    return `${value} ${unit}${dimSuffix}`.trim()
  }
}

/**
 * Get visualization data for a distribution
 */
function getVizData(q: Quantity): VizData {
  const samples = q.toParticles()
  const data = calculateDotplotData(samples, 20, q.unit.toString())
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
