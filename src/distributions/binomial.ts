/**
 * Binomial distribution
 *
 * For number of successes in n independent trials
 */

import { Quantity } from '../core/Quantity.js'

/**
 * Generate a single binomial sample
 */
function binomialSample(n: number, p: number): number {
  if (n * p < 10 && n * (1 - p) < 10) {
    // Direct simulation for small n*p
    let successes = 0
    for (let i = 0; i < n; i++) {
      if (Math.random() < p) successes++
    }
    return successes
  } else {
    // Normal approximation for large n*p
    const mean = n * p
    const stddev = Math.sqrt(n * p * (1 - p))
    const u1 = Math.random()
    const u2 = Math.random()
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
    return Math.max(0, Math.min(n, Math.round(mean + stddev * z)))
  }
}

/**
 * Create a binomial distribution
 *
 * The binomial distribution models the number of successes in n independent
 * trials, each with probability p of success.
 *
 * @param n - Number of trials (must be positive integer)
 * @param p - Probability of success per trial (must be between 0 and 1)
 * @param unitString - Optional unit string
 * @param samples - Number of samples (default 20,000)
 * @returns Quantity with binomial distribution
 *
 * @example
 * ```ts
 * binomial(10, 0.5)           // Coin flips: 10 flips, 50% heads
 * binomial(100, 0.01)         // Defects: 100 items, 1% defect rate
 * ```
 */
export function binomial(
  n: number,
  p: number,
  unitString?: string,
  sampleCount: number = 20000
): Quantity {
  if (n <= 0 || !Number.isInteger(n)) {
    throw new Error('Binomial n parameter must be a positive integer')
  }

  if (p < 0 || p > 1) {
    throw new Error('Binomial p parameter must be between 0 and 1')
  }

  // Generate samples
  const samples: number[] = new Array(sampleCount)
  for (let i = 0; i < sampleCount; i++) {
    samples[i] = binomialSample(n, p)
  }

  return new Quantity(samples, unitString)
}
