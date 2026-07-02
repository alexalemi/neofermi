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
 * @param a - Lower bound (~16th percentile at the default confidence)
 * @param b - Upper bound (~84th percentile at the default confidence)
 * @param unitString - Optional unit string (e.g., 'meters', 'kg')
 * @param p - Confidence level: fraction of mass in [a, b] (default 0.6827, the +/-1 sigma convention)
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
  if (!Number.isFinite(a) || !Number.isFinite(b)) {
    throw new Error(`Bounds must be finite numbers, got ${a} and ${b}`)
  }

  if (a <= 0 || b <= 0) {
    throw new Error('LogNormal distribution requires positive bounds')
  }

  if (a >= b) {
    throw new Error('Lower bound must be less than upper bound')
  }

  if (!(p > 0 && p < 1)) {
    throw new Error(`Confidence level must be strictly between 0 and 1, got ${p}`)
  }

  // Calculate parameters in log-space. Work with log(a) and log(b) directly:
  // b*a or b/a can overflow/underflow double precision even when both bounds
  // are individually representable (e.g. lognormal(1e200, 1e250)).
  const logA = Math.log(a)
  const logB = Math.log(b)

  // mu is the geometric mean in log-space
  const mu = 0.5 * (logA + logB)

  // Calculate factor for converting percentile to std devs
  const f = -factor(0.5 * (1 - p))

  // sigma in log-space
  const sig = (0.5 * (logB - logA)) / f

  // Generate samples
  const normalSamples = randn(n)
  const samples = normalSamples.map((z) => Math.exp(mu + sig * z))

  return new Quantity(samples, unitString)
}
