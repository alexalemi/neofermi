/**
 * Gamma distribution
 *
 * For counts, rates, and positive continuous values from counting processes.
 */

import { Quantity } from '../core/Quantity.js'
import { DEFAULT_SAMPLE_COUNT } from '../config.js'

/**
 * Generate a single gamma-distributed sample using Marsaglia and Tsang method
 */
function gammaSample(shape: number, scale: number = 1): number {
  if (shape < 1) {
    // For shape < 1, use: if X ~ Gamma(shape+1, scale), then X*U^(1/shape) ~ Gamma(shape, scale)
    const x = gammaSample(shape + 1, scale)
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
      return d * v * scale
    }

    if (Math.log(u) < 0.5 * x2 + d * (1 - v + Math.log(v))) {
      return d * v * scale
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
 * Create a gamma distribution
 *
 * The gamma distribution is useful for modeling positive continuous values,
 * especially those arising from counting processes, waiting times, or rates.
 *
 * @param shape - Shape parameter (k or α, must be > 0)
 * @param scale - Scale parameter (θ, default 1)
 * @param unitString - Optional unit string
 * @param n - Number of samples (default 20,000)
 * @returns Quantity with gamma distribution
 *
 * @example
 * ```ts
 * gamma(10, 1, 'events')     // Count-like data
 * gamma(5, 2, 'meters')      // Positive continuous measurements
 * gamma(1, 1)                // Exponential distribution (special case)
 * ```
 */
export function gamma(
  shape: number,
  scale: number = 1,
  unitString?: string,
  n: number = DEFAULT_SAMPLE_COUNT
): Quantity {
  if (shape <= 0) {
    throw new Error('Gamma shape parameter must be positive')
  }

  if (scale <= 0) {
    throw new Error('Gamma scale parameter must be positive')
  }

  // Generate samples
  const samples: number[] = new Array(n)
  for (let i = 0; i < n; i++) {
    samples[i] = gammaSample(shape, scale)
  }

  return new Quantity(samples, unitString)
}
