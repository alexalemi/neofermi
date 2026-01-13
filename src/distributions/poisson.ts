/**
 * Poisson distribution
 *
 * For count data - number of events in a fixed interval
 */

import { Quantity } from '../core/Quantity.js'
import { DEFAULT_SAMPLE_COUNT } from '../config.js'

/**
 * Generate a single Poisson sample using inverse transform
 */
function poissonSample(lambda: number): number {
  if (lambda < 30) {
    // Direct method for small lambda
    const L = Math.exp(-lambda)
    let k = 0
    let p = 1

    do {
      k++
      p *= Math.random()
    } while (p > L)

    return k - 1
  } else {
    // Normal approximation for large lambda
    const u1 = Math.random()
    const u2 = Math.random()
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
    return Math.max(0, Math.round(lambda + Math.sqrt(lambda) * z))
  }
}

/**
 * Create a Poisson distribution
 *
 * The Poisson distribution models the number of events in a fixed interval
 * when events occur independently at a constant average rate.
 *
 * @param lambda - Rate parameter (expected number of events, must be > 0)
 * @param unitString - Optional unit string
 * @param n - Number of samples (default 20,000)
 * @returns Quantity with Poisson distribution
 *
 * @example
 * ```ts
 * poisson(5)                  // 5 expected events
 * poisson(10, 'calls/hour')   // 10 calls per hour
 * ```
 */
export function poisson(
  lambda: number,
  unitString?: string,
  n: number = DEFAULT_SAMPLE_COUNT
): Quantity {
  if (lambda <= 0) {
    throw new Error('Poisson rate parameter must be positive')
  }

  // Generate samples
  const samples: number[] = new Array(n)
  for (let i = 0; i < n; i++) {
    samples[i] = poissonSample(lambda)
  }

  return new Quantity(samples, unitString)
}
