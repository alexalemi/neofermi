/**
 * Convenience functions built on core distributions
 */

import { Quantity } from '../core/Quantity.js'
import { DEFAULT_SAMPLE_COUNT, DEFAULT_CONFIDENCE } from '../config.js'
import { lognormal } from './lognormal.js'
import { normal } from './normal.js'

/**
 * Smart range function: chooses lognormal or normal based on signs
 *
 * This is the most commonly used function. It automatically chooses:
 * - LogNormal if both bounds are positive (multiplicative/orders of magnitude)
 * - Normal if bounds can be negative (additive)
 *
 * @param a - Lower bound
 * @param b - Upper bound
 * @param unitString - Optional unit string
 * @param p - Confidence level (default 0.9)
 * @param n - Number of samples (default 20,000)
 * @returns Quantity with appropriate distribution
 *
 * @example
 * ```ts
 * to(10, 100, 'meters')     // → lognormal (both positive)
 * to(-10, 10, 'celsius')    // → normal (can be negative)
 * to(1e6, 1e9, 'dollars')   // → lognormal (orders of magnitude)
 * ```
 */
export function to(
  a: number,
  b: number,
  unitString?: string,
  p: number = DEFAULT_CONFIDENCE,
  n: number = DEFAULT_SAMPLE_COUNT
): Quantity {
  if (a > 0 && b > 0) {
    // Both positive: use lognormal (DEFAULT)
    return lognormal(a, b, unitString, p, n)
  } else {
    // Can be negative: use normal
    return normal(a, b, unitString, p, n)
  }
}

/**
 * Percentage error (multiplicative)
 *
 * Creates a lognormal distribution centered at 1 with the given percentage error.
 * Useful for "give or take X%" calculations.
 *
 * @param percentage - Percentage error (e.g., 10 for ±10%)
 * @param p - Confidence level (default 0.9)
 * @param n - Number of samples (default 20,000)
 * @returns Quantity with lognormal distribution (dimensionless)
 *
 * @example
 * ```ts
 * const estimate = new Quantity(100, 'meters')
 * const withError = estimate.multiply(percent(10))  // "100 ± 10% meters"
 * ```
 */
export function percent(
  percentage: number,
  p: number = DEFAULT_CONFIDENCE,
  n: number = DEFAULT_SAMPLE_COUNT
): Quantity {
  const top = 1.0 + percentage / 100.0
  return lognormal(1.0 / top, top, undefined, p, n)
}

/**
 * Decibel-based error (multiplicative)
 *
 * Creates a lognormal distribution for "order of magnitude" thinking.
 * - 10 dB = factor of 10 (one order of magnitude)
 * - 3 dB ≈ factor of 2
 *
 * @param decibels - Uncertainty in decibels (default 1)
 * @param p - Confidence level (default 0.9)
 * @param n - Number of samples (default 20,000)
 * @returns Quantity with lognormal distribution (dimensionless)
 *
 * @example
 * ```ts
 * const estimate = new Quantity(100, 'meters')
 * const withError = estimate.multiply(db(10))  // "100, give or take an order of magnitude"
 * // Result: roughly 10 to 1000 meters
 * ```
 */
export function db(
  decibels: number = 1.0,
  p: number = DEFAULT_CONFIDENCE,
  n: number = DEFAULT_SAMPLE_COUNT
): Quantity {
  const low = Math.pow(10, -decibels / 10.0)
  const high = Math.pow(10, decibels / 10.0)
  return lognormal(low, high, undefined, p, n)
}
