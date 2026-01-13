/**
 * Sensitivity Analysis for NeoFermi
 *
 * Variance decomposition to understand which inputs contribute most to output uncertainty.
 */

import { Quantity } from '../core/Quantity.js'

export interface SensitivityResult {
  name: string
  varianceContribution: number  // Absolute variance reduction when input is fixed
  percentContribution: number   // Percentage of total variance explained
  inputMean: number
  inputStd: number
}

export interface SensitivityAnalysis {
  outputMean: number
  outputStd: number
  outputVariance: number
  inputs: SensitivityResult[]
  unexplainedVariance: number  // Variance not explained by any single input (interactions)
}

/**
 * Perform sensitivity analysis on a computation
 *
 * This uses variance decomposition: for each input, we fix it at its mean
 * and measure how much the output variance decreases. Inputs that contribute
 * more to output uncertainty will show larger variance reductions.
 *
 * @param inputs - Map of input names to their Quantity values
 * @param computeOutput - Function that takes inputs and computes output
 * @returns Sensitivity analysis results
 *
 * @example
 * ```ts
 * const inputs = new Map([
 *   ['length', to(1, 10, 'm')],
 *   ['width', to(2, 5, 'm')]
 * ])
 * const result = analyzeSensitivity(inputs, (inp) => {
 *   return inp.get('length')!.multiply(inp.get('width')!)
 * })
 * // Shows which dimension contributes more to area uncertainty
 * ```
 */
export function analyzeSensitivity(
  inputs: Map<string, Quantity>,
  computeOutput: (inputs: Map<string, Quantity>) => Quantity
): SensitivityAnalysis {
  // Compute baseline output with all inputs as distributions
  const baselineOutput = computeOutput(inputs)
  const outputVariance = variance(baselineOutput)
  const outputMean = baselineOutput.mean()
  const outputStd = baselineOutput.std()

  const results: SensitivityResult[] = []
  let totalExplained = 0

  // For each input, fix it at its mean and measure variance reduction
  for (const [name, inputQuantity] of inputs) {
    const inputMean = inputQuantity.mean()
    const inputStd = inputQuantity.std()

    // Create a copy of inputs with this one fixed at its mean
    const fixedInputs = new Map(inputs)
    fixedInputs.set(name, new Quantity(inputMean, inputQuantity.unit.toString() || undefined))

    // Compute output with this input fixed
    const fixedOutput = computeOutput(fixedInputs)
    const fixedVariance = variance(fixedOutput)

    // Variance reduction = contribution of this input
    const varianceContribution = Math.max(0, outputVariance - fixedVariance)
    const percentContribution = outputVariance > 0
      ? (varianceContribution / outputVariance) * 100
      : 0

    totalExplained += varianceContribution

    results.push({
      name,
      varianceContribution,
      percentContribution,
      inputMean,
      inputStd
    })
  }

  // Sort by contribution (highest first)
  results.sort((a, b) => b.varianceContribution - a.varianceContribution)

  // Unexplained variance (due to interactions between inputs)
  const unexplainedVariance = Math.max(0, outputVariance - totalExplained)

  return {
    outputMean,
    outputStd,
    outputVariance,
    inputs: results,
    unexplainedVariance
  }
}

/**
 * Compute variance of a Quantity
 */
function variance(q: Quantity): number {
  if (q.isScalar()) return 0
  const values = q.value as number[]
  const mean = q.mean()
  const sumSquaredDiff = values.reduce((sum, v) => sum + (v - mean) ** 2, 0)
  return sumSquaredDiff / values.length
}

/**
 * Format sensitivity analysis results as a string
 */
export function formatSensitivity(analysis: SensitivityAnalysis): string {
  const lines: string[] = []

  lines.push(`Output: ${analysis.outputMean.toExponential(3)} ± ${analysis.outputStd.toExponential(3)}`)
  lines.push('')
  lines.push('Variance Contribution:')

  for (const input of analysis.inputs) {
    const bar = '█'.repeat(Math.round(input.percentContribution / 5))
    lines.push(`  ${input.name}: ${input.percentContribution.toFixed(1)}% ${bar}`)
  }

  if (analysis.unexplainedVariance > 0 && analysis.outputVariance > 0) {
    const unexplainedPercent = (analysis.unexplainedVariance / analysis.outputVariance) * 100
    if (unexplainedPercent > 1) {
      lines.push(`  (interactions): ${unexplainedPercent.toFixed(1)}%`)
    }
  }

  return lines.join('\n')
}
