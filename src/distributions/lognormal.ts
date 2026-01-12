/**
 * LogNormal distribution
 *
 * This is the DEFAULT distribution for positive quantities in NeoFermi.
 * Most Fermi estimates involve positive quantities that vary multiplicatively.
 */

import { Quantity } from '../core/Quantity.js'
import { DEFAULT_SAMPLE_COUNT, DEFAULT_CONFIDENCE } from '../config.js'
import { factor, randn } from '../utils/math.js'

/**
 * Create a lognormal distribution between two values
 *
 * The lognormal distribution is ideal for positive quantities that vary
 * multiplicatively (most physical quantities: mass, distance, time, energy).
 *
 * @param a - Lower bound (5th percentile by default)
 * @param b - Upper bound (95th percentile by default)
 * @param unitString - Optional unit string (e.g., 'meters', 'kg')
 * @param p - Confidence level (default 0.9 means 90% of mass in [a, b])
 * @param n - Number of samples (default 20,000)
 * @returns Quantity with lognormal distribution
 *
 * @example
 * ```ts
 * lognormal(10, 100, 'meters')  // Could be 10m to 100m (order of magnitude)
 * lognormal(1e6, 1e9, 'dollars')  // Million to billion dollars
 * ```
 */
export function lognormal(
  a: number,
  b: number,
  unitString?: string,
  p: number = DEFAULT_CONFIDENCE,
  n: number = DEFAULT_SAMPLE_COUNT
): Quantity {
  if (a <= 0 || b <= 0) {
    throw new Error('LogNormal distribution requires positive bounds')
  }

  if (a >= b) {
    throw new Error('Lower bound must be less than upper bound')
  }

  // Calculate parameters in log-space
  // mu is the geometric mean in log-space
  const mu = Math.log(Math.sqrt(b * a))

  // Calculate factor for converting percentile to std devs
  const f = -factor(0.5 * (1 - p))

  // sigma in log-space
  const sig = Math.log(Math.sqrt(b / a)) / f

  // Generate samples
  const normalSamples = randn(n)
  const samples = normalSamples.map((z) => Math.exp(mu + sig * z))

  return new Quantity(samples, unitString)
}
