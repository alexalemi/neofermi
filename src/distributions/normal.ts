/**
 * Normal (Gaussian) distribution
 *
 * For quantities that can be negative or are additive in nature.
 */

import { Quantity } from '../core/Quantity.js'
import { DEFAULT_SAMPLE_COUNT, DEFAULT_CONFIDENCE } from '../config.js'
import { factor, randn } from '../utils/math.js'

/**
 * Create a normal distribution between two values
 *
 * Use this for quantities that can be negative or are centered around
 * a mean value (e.g., temperature, elevation relative to sea level).
 *
 * @param a - Lower bound (5th percentile by default)
 * @param b - Upper bound (95th percentile by default)
 * @param unitString - Optional unit string
 * @param p - Confidence level (default 0.9)
 * @param n - Number of samples (default 20,000)
 * @returns Quantity with normal distribution
 *
 * @example
 * ```ts
 * normal(-10, 10, 'celsius')  // Temperature from -10°C to 10°C
 * normal(0, 100, 'meters')    // Distance from 0 to 100 meters
 * ```
 */
export function normal(
  a: number,
  b: number,
  unitString?: string,
  p: number = DEFAULT_CONFIDENCE,
  n: number = DEFAULT_SAMPLE_COUNT
): Quantity {
  if (a >= b) {
    throw new Error('Lower bound must be less than upper bound')
  }

  // Calculate parameters
  // mu is the arithmetic mean
  const mu = 0.5 * (a + b)

  // Calculate factor for converting percentile to std devs
  const f = -factor(0.5 * (1 - p))

  // sigma
  const sig = 0.5 * (b - a) / f

  // Generate samples
  const samples = randn(n).map((z) => mu + sig * z)

  return new Quantity(samples, unitString)
}

/**
 * Create a normal distribution with explicit mean and standard deviation
 *
 * This is the "X ± Y" notation.
 *
 * @param mean - Mean value
 * @param std - Standard deviation
 * @param unitString - Optional unit string
 * @param n - Number of samples (default 20,000)
 * @returns Quantity with normal distribution
 *
 * @example
 * ```ts
 * plusminus(100, 10, 'meters')  // "100 ± 10 meters"
 * plusminus(0, 1)               // Standard normal
 * ```
 */
export function plusminus(
  mean: number,
  std: number,
  unitString?: string,
  n: number = DEFAULT_SAMPLE_COUNT
): Quantity {
  if (std < 0) {
    throw new Error('Standard deviation must be non-negative')
  }

  // Generate samples
  const samples = randn(n).map((z) => mean + std * z)

  return new Quantity(samples, unitString)
}
