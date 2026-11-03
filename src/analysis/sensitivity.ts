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

/** Population variance of a Quantity's particles (0 for a scalar). */
function variance(q: Quantity): number {
  return q.std() ** 2
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

export interface RankSensitivity {
  name: string
  /** Spearman rank correlation between the input and the output samples. */
  correlation: number
  /** correlation², the share of output (rank) variance this input explains. */
  share: number
}

/**
 * Sample-based sensitivity: which named inputs drive an output's spread.
 *
 * NeoFermi keeps samples index-aligned through arithmetic (sample i of the
 * output was computed from sample i of every input), so no re-evaluation is
 * needed: an input's squared Spearman rank correlation with the output is the
 * share of output variance it explains. For the products and quotients
 * typical of Fermi estimates — independent inputs, output additive in log
 * space — the shares sum to ≈1; what is left over comes from unnamed inline
 * distributions or interactions. Rank-based, so it is unit-, scale- and
 * sign-agnostic.
 */
export function rankSensitivity(
  output: Quantity,
  inputs: Map<string, Quantity>
): RankSensitivity[] {
  const out = output.toParticles()
  const outRanks = ranks(out)
  const results: RankSensitivity[] = []
  for (const [name, q] of inputs) {
    const xs = q.toParticles()
    if (xs.length !== out.length) continue
    const r = pearson(ranks(xs), outRanks)
    results.push({ name, correlation: r, share: r * r })
  }
  return results.sort((a, b) => b.share - a.share)
}

/** Text report for `sensitivity(x)`: one bar per input, largest first. */
export function formatRankSensitivity(label: string, results: RankSensitivity[]): string {
  const width = Math.max(5, ...results.map((r) => r.name.length))
  const line = (name: string, share: number, sign: string) =>
    `  ${name.padEnd(width)}  ${sign} ${(share * 100).toFixed(0).padStart(3)}%  ${'█'.repeat(Math.round(share * 20))}`
  const lines = [`Sensitivity of ${label} (share of variance):`]
  for (const r of results) lines.push(line(r.name, r.share, r.correlation >= 0 ? '+' : '−'))
  const other = 1 - results.reduce((sum, r) => sum + r.share, 0)
  if (other > 0.02) lines.push(line('other', other, ' '))
  return lines.join('\n')
}

/** Average ranks (ties share the mean rank). */
function ranks(xs: number[]): number[] {
  const order = xs.map((_, i) => i).sort((a, b) => xs[a] - xs[b])
  const out = new Array<number>(xs.length)
  for (let i = 0; i < order.length; ) {
    let j = i
    while (j + 1 < order.length && xs[order[j + 1]] === xs[order[i]]) j++
    const rank = (i + j) / 2
    for (let k = i; k <= j; k++) out[order[k]] = rank
    i = j + 1
  }
  return out
}

function pearson(a: number[], b: number[]): number {
  const n = a.length
  let ma = 0, mb = 0
  for (let i = 0; i < n; i++) { ma += a[i]; mb += b[i] }
  ma /= n; mb /= n
  let sab = 0, saa = 0, sbb = 0
  for (let i = 0; i < n; i++) {
    const da = a[i] - ma, db = b[i] - mb
    sab += da * db; saa += da * da; sbb += db * db
  }
  return saa > 0 && sbb > 0 ? sab / Math.sqrt(saa * sbb) : 0
}
