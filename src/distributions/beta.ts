/**
 * Beta distribution
 *
 * For proportions and probabilities (values between 0 and 1).
 */

import { Quantity } from '../core/Quantity.js'
import { DEFAULT_SAMPLE_COUNT } from '../config.js'

/**
 * Generate beta-distributed random samples using accept-reject method
 * This is a simple implementation; could be optimized later
 */
function betaSamples(alpha: number, beta: number, n: number): number[] {
  const samples: number[] = new Array(n)

  for (let i = 0; i < n; i++) {
    // Use gamma ratio method
    // If X ~ Gamma(α, 1) and Y ~ Gamma(β, 1), then X/(X+Y) ~ Beta(α, β)
    const x = gammaSample(alpha)
    const y = gammaSample(beta)
    samples[i] = x / (x + y)
  }

  return samples
}

/**
 * Generate a single gamma-distributed sample using Marsaglia and Tsang method
 */
function gammaSample(shape: number): number {
  if (shape < 1) {
    // For shape < 1, use the method: if X ~ Gamma(shape+1), then X*U^(1/shape) ~ Gamma(shape)
    const x = gammaSample(shape + 1)
    return x * Math.pow(Math.random(), 1 / shape)
  }

  // Marsaglia and Tsang's method for shape >= 1
  const d = shape - 1 / 3
  const c = 1 / Math.sqrt(9 * d)

  while (true) {
    let x, v
    do {
      x = randomNormal()
      v = 1 + c * x
    } while (v <= 0)

    v = v * v * v
    const u = Math.random()
    const x2 = x * x

    if (u < 1 - 0.0331 * x2 * x2) {
      return d * v
    }

    if (Math.log(u) < 0.5 * x2 + d * (1 - v + Math.log(v))) {
      return d * v
    }
  }
}

/**
 * Generate a single standard normal sample using Box-Muller
 */
function randomNormal(): number {
  const u1 = Math.random()
  const u2 = Math.random()
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
}

/**
 * Create a beta distribution for proportions from count data
 *
 * This is the natural distribution for "X out of N" observations.
 * Uses Laplace smoothing (+1 to both parameters) to avoid 0/1 probabilities.
 *
 * @param successes - Number of successes observed
 * @param total - Total number of trials
 * @param n - Number of samples (default 20,000)
 * @returns Quantity with beta distribution (no units, between 0 and 1)
 *
 * @example
 * ```ts
 * outof(7, 10)   // "7 out of 10" → beta distribution
 * outof(70, 100) // Same mean (0.7) but tighter (more data)
 * ```
 */
export function outof(
  successes: number,
  total: number,
  n: number = DEFAULT_SAMPLE_COUNT
): Quantity {
  if (successes < 0 || total < 0 || successes > total) {
    throw new Error('Invalid arguments: successes must be in [0, total]')
  }

  // Laplace smoothing: add 1 to both parameters
  // This prevents 0/1 probabilities and gives a reasonable prior
  const alpha = successes + 1
  const beta = total - successes + 1

  const samples = betaSamples(alpha, beta, n)
  return new Quantity(samples) // No units (proportion)
}

/**
 * Alternative phrasing for beta distribution
 *
 * "X for, Y against" instead of "X out of (X+Y)"
 *
 * @param forCount - Count in favor
 * @param againstCount - Count against
 * @param n - Number of samples
 * @returns Quantity with beta distribution
 */
export function against(
  forCount: number,
  againstCount: number,
  n: number = DEFAULT_SAMPLE_COUNT
): Quantity {
  if (forCount < 0 || againstCount < 0) {
    throw new Error('Counts must be non-negative')
  }

  const alpha = forCount
  const beta = againstCount

  const samples = betaSamples(alpha, beta, n)
  return new Quantity(samples) // No units (proportion)
}

/**
 * Direct beta distribution with shape parameters
 *
 * @param alpha - Shape parameter (> 0)
 * @param beta - Shape parameter (> 0)
 * @param n - Number of samples
 * @returns Quantity with beta distribution
 */
export function beta(alpha: number, beta: number, n: number = DEFAULT_SAMPLE_COUNT): Quantity {
  if (alpha <= 0 || beta <= 0) {
    throw new Error('Beta parameters must be positive')
  }

  const samples = betaSamples(alpha, beta, n)
  return new Quantity(samples)
}
