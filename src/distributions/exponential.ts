/**
 * Exponential distribution
 *
 * For waiting times and time between events
 */

import { Quantity } from '../core/Quantity.js'
import { DEFAULT_SAMPLE_COUNT } from '../config.js'

/**
 * Generate a single exponential sample using inverse transform
 */
function exponentialSample(rate: number): number {
  return -Math.log(1 - Math.random()) / rate
}

/**
 * Create an exponential distribution
 *
 * The exponential distribution models waiting times between events
 * in a Poisson process, or the lifetime of objects that "don't age".
 *
 * @param rate - Rate parameter (λ, events per unit time, must be > 0)
 *               Mean = 1/rate
 * @param unitString - Optional unit string
 * @param n - Number of samples (default 20,000)
 * @returns Quantity with exponential distribution
 *
 * @example
 * ```ts
 * exponential(0.5, 'hour')    // Mean waiting time of 2 hours
 * exponential(10, 'ms')       // Mean waiting time of 0.1 ms
 * ```
 */
export function exponential(
  rate: number,
  unitString?: string,
  n: number = DEFAULT_SAMPLE_COUNT
): Quantity {
  if (rate <= 0) {
    throw new Error('Exponential rate parameter must be positive')
  }

  // Generate samples
  const samples: number[] = new Array(n)
  for (let i = 0; i < n; i++) {
    samples[i] = exponentialSample(rate)
  }

  return new Quantity(samples, unitString)
}

/**
 * Create an exponential distribution parameterized by mean
 *
 * @param mean - Mean of the distribution (must be > 0)
 * @param unitString - Optional unit string
 * @param n - Number of samples
 * @returns Quantity with exponential distribution
 */
export function exponentialMean(
  mean: number,
  unitString?: string,
  n: number = DEFAULT_SAMPLE_COUNT
): Quantity {
  if (mean <= 0) {
    throw new Error('Exponential mean must be positive')
  }
  return exponential(1 / mean, unitString, n)
}
