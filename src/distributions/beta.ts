/**
 * Beta distribution
 *
 * For proportions and probabilities (values between 0 and 1).
 */

import { Quantity } from '../core/Quantity.js'
import { DEFAULT_SAMPLE_COUNT } from '../config.js'

/**
 * Generate beta-distributed random samples via the gamma-ratio method:
 * if X ~ Gamma(α, 1) and Y ~ Gamma(β, 1), then X/(X+Y) ~ Beta(α, β).
 *
 * The ratio is computed from log-space draws as the logistic
 * 1/(1 + e^(log Y − log X)); for small shapes the raw gamma draws underflow
 * to exact 0 and the plain ratio would give 0/0 = NaN.
 */
function betaSamples(alpha: number, beta: number, n: number): number[] {
  const samples: number[] = new Array(n)

  for (let i = 0; i < n; i++) {
    const lx = logGammaSample(alpha)
    const ly = logGammaSample(beta)
    samples[i] = 1 / (1 + Math.exp(ly - lx))
  }

  return samples
}

/**
 * Log of a single Gamma(shape, 1) draw. The shape < 1 boost — if
 * X ~ Gamma(shape+1) then X·U^(1/shape) ~ Gamma(shape) — is applied in log
 * space, where U^(1/shape) can't underflow to 0.
 */
function logGammaSample(shape: number): number {
  if (shape < 1) {
    // 1 - random() is in (0, 1] so the log is finite.
    return logGammaSample(shape + 1) + Math.log(1 - Math.random()) / shape
  }
  return Math.log(gammaSample(shape))
}

/**
 * Generate a single gamma-distributed sample using Marsaglia and Tsang's
 * method (requires shape >= 1; smaller shapes go through logGammaSample).
 */
function gammaSample(shape: number): number {
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
 * Generate a single standard normal sample using Box-Muller.
 * Draw u1 from (0, 1] (via 1 - random()) so log(u1) can't be -Infinity.
 */
function randomNormal(): number {
  const u1 = 1 - Math.random()
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
  // Negated comparisons so NaN fails validation too.
  if (!(successes >= 0) || !(total >= 0) || successes > total || !Number.isFinite(total)) {
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
 * Alternative phrasing for beta distribution.
 *
 * "X for, Y against" — equivalent to `outof(X, X + Y)`, including the Laplace
 * smoothing: parameters are `Beta(X + 1, Y + 1)`. So `5 against 0` is a sharp
 * but not point-mass distribution near 1, and `0 against 0` is `Beta(1, 1)`
 * (uniform) rather than the all-NaN result raw counts would give.
 *
 * @param forCount - Count in favor (≥ 0)
 * @param againstCount - Count against (≥ 0)
 * @param n - Number of samples
 * @returns Quantity with beta distribution (no units, between 0 and 1)
 */
export function against(
  forCount: number,
  againstCount: number,
  n: number = DEFAULT_SAMPLE_COUNT
): Quantity {
  if (!Number.isFinite(forCount) || !Number.isFinite(againstCount) || forCount < 0 || againstCount < 0) {
    throw new Error('Counts must be non-negative finite numbers')
  }

  const samples = betaSamples(forCount + 1, againstCount + 1, n)
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
  if (!Number.isFinite(alpha) || !Number.isFinite(beta) || alpha <= 0 || beta <= 0) {
    throw new Error('Beta parameters must be positive finite numbers')
  }

  const samples = betaSamples(alpha, beta, n)
  return new Quantity(samples)
}
