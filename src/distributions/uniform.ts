/**
 * Uniform distribution
 *
 * Maximum entropy prior when only bounds are known.
 */

import { Quantity } from '../core/Quantity.js'
import { DEFAULT_SAMPLE_COUNT } from '../config.js'
import { rand } from '../utils/math.js'

/**
 * Create a uniform distribution between two values
 *
 * Use this when you know the bounds but have no other information
 * about the distribution. Every value in [a, b] is equally likely.
 *
 * @param a - Lower bound
 * @param b - Upper bound
 * @param unitString - Optional unit string
 * @param n - Number of samples (default 20,000)
 * @returns Quantity with uniform distribution
 *
 * @example
 * ```ts
 * uniform(1, 10, 'meters')  // Could be anywhere from 1 to 10 meters
 * uniform(0, 1)             // Standard uniform on [0, 1]
 * ```
 */
export function uniform(
  a: number,
  b: number,
  unitString?: string,
  n: number = DEFAULT_SAMPLE_COUNT
): Quantity {
  if (a >= b) {
    throw new Error('Lower bound must be less than upper bound')
  }

  // Generate samples
  const samples = rand(n).map((u) => a + (b - a) * u)

  return new Quantity(samples, unitString)
}
