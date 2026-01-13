/**
 * Weighted discrete distribution
 *
 * For sampling from a set of discrete values with given weights/probabilities.
 */

import { Quantity } from '../core/Quantity.js'
import { DEFAULT_SAMPLE_COUNT } from '../config.js'

/**
 * Create a weighted discrete distribution
 *
 * Samples from discrete values according to their relative weights.
 * Useful for things like calendar calculations where days vary by month.
 *
 * @param values - Array of discrete values to sample from
 * @param weights - Array of weights (relative frequencies, don't need to sum to 1)
 * @param unitString - Optional unit string
 * @param n - Number of samples (default 20,000)
 * @returns Quantity with weighted discrete distribution
 *
 * @example
 * ```ts
 * // Gregorian calendar year (303 regular years, 97 leap years per 400 year cycle)
 * weighted([365, 366], [303, 97], 'day')
 *
 * // Month lengths in days
 * weighted([31, 29, 30, 28], [2800, 97, 1600, 303], 'day')
 * ```
 */
export function weighted(
  values: number[],
  weights: number[],
  unitString?: string,
  n: number = DEFAULT_SAMPLE_COUNT
): Quantity {
  if (values.length === 0) {
    throw new Error('Values array cannot be empty')
  }
  if (values.length !== weights.length) {
    throw new Error('Values and weights arrays must have the same length')
  }
  if (weights.some((w) => w < 0)) {
    throw new Error('Weights must be non-negative')
  }

  // Normalize weights to create cumulative distribution
  const totalWeight = weights.reduce((a, b) => a + b, 0)
  if (totalWeight === 0) {
    throw new Error('Total weight must be positive')
  }

  // Create cumulative distribution function
  const cdf: number[] = []
  let cumulative = 0
  for (const w of weights) {
    cumulative += w / totalWeight
    cdf.push(cumulative)
  }

  // Sample from distribution
  const samples: number[] = new Array(n)
  for (let i = 0; i < n; i++) {
    const r = Math.random()
    // Binary search for the bucket
    let lo = 0
    let hi = cdf.length - 1
    while (lo < hi) {
      const mid = Math.floor((lo + hi) / 2)
      if (cdf[mid] < r) {
        lo = mid + 1
      } else {
        hi = mid
      }
    }
    samples[i] = values[lo]
  }

  return new Quantity(samples, unitString)
}
