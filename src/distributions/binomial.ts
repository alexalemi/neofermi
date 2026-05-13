/**
 * Binomial distribution
 *
 * For number of successes in n independent trials
 */

import { Quantity } from '../core/Quantity.js'
import { DEFAULT_SAMPLE_COUNT } from '../config.js'

/** Draw one Poisson(λ) sample via Knuth's product method. Used here only for λ < 10. */
function smallPoissonSample(lambda: number): number {
  const L = Math.exp(-lambda)
  let k = 0
  let prod = 1
  do {
    k++
    prod *= Math.random()
  } while (prod > L)
  return k - 1
}

/** Draw one standard-normal sample (Box–Muller; u1 ∈ (0,1] so log(u1) is finite). */
function gaussianSample(): number {
  const u1 = 1 - Math.random()
  const u2 = Math.random()
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
}

/**
 * Generate a single Binomial(n, p) sample.
 *
 * - small n: simulate every trial (exact, and cheap in this regime);
 * - rare successes (np < 10): Binomial(n, p) ≈ Poisson(np);
 * - rare failures  (n(1−p) < 10): n − Poisson(n(1−p));
 * - otherwise: normal approximation N(np, np(1−p)).
 */
function binomialSample(n: number, p: number): number {
  if (n <= 1000) {
    let successes = 0
    for (let i = 0; i < n; i++) if (Math.random() < p) successes++
    return successes
  }
  const mean = n * p
  if (mean < 10) return smallPoissonSample(mean)
  if (n - mean < 10) return n - smallPoissonSample(n - mean)
  const z = gaussianSample()
  return Math.max(0, Math.min(n, Math.round(mean + Math.sqrt(mean * (1 - p)) * z)))
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
 * @param sampleCount - Number of samples (default 20,000)
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
  sampleCount: number = DEFAULT_SAMPLE_COUNT
): Quantity {
  if (n <= 0 || !Number.isInteger(n)) {
    throw new Error('Binomial n parameter must be a positive integer')
  }
  if (p < 0 || p > 1) {
    throw new Error('Binomial p parameter must be between 0 and 1')
  }

  const samples: number[] = new Array(sampleCount)
  for (let i = 0; i < sampleCount; i++) {
    samples[i] = binomialSample(n, p)
  }
  return new Quantity(samples, unitString)
}
