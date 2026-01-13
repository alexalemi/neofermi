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
 * Decibel-based precision (multiplicative twiddle factor)
 *
 * Creates a lognormal distribution from 1/(1+10^(-x/10)) to (1+10^(-x/10)).
 * Higher (positive) values = more precise. Lower (negative) = more uncertain.
 * - -10 dB ≈ factor of 11 uncertainty (order of magnitude)
 * - -3 dB ≈ factor of 3 uncertainty
 * - 0 dB = factor of 2 uncertainty (baseline)
 * - 10 dB ≈ factor of 1.1 (very precise)
 *
 * @param decibels - Precision in decibels (positive = precise, negative = uncertain)
 * @param p - Confidence level (default 0.9)
 * @param n - Number of samples (default 20,000)
 * @returns Quantity with lognormal distribution (dimensionless)
 */
export function db(
  decibels: number = 0,
  p: number = DEFAULT_CONFIDENCE,
  n: number = DEFAULT_SAMPLE_COUNT
): Quantity {
  // Factor = 1 + 10^(-x/10)
  // Range from 1/factor to factor
  const factor = 1 + Math.pow(10, -decibels / 10.0)
  const low = 1 / factor
  const high = factor

  return lognormal(low, high, undefined, p, n)
}
